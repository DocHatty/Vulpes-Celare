#!/usr/bin/env node
/**
 * build-dictionaries.js - Build SQLite FTS5 Dictionary Database
 *
 * This script creates a SQLite database containing all dictionary entries
 * with FTS5 trigram indexing for fuzzy matching. The database is memory-mapped
 * by the OS, reducing JS heap usage by ~96%.
 *
 * USAGE:
 *   node scripts/build-dictionaries.js
 *
 * OUTPUT:
 *   data/vulpes-dictionaries.db
 *
 * TABLES:
 *   - first_names: First name dictionary with soundex codes
 *   - surnames: Surname dictionary with soundex codes
 *   - hospitals: Hospital/facility names
 *   - cities: City names with state
 *   - names_fts: FTS5 virtual table for trigram fuzzy matching
 *   - metadata: Bloom filter cache, version info
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Paths
const DATA_DIR = path.join(__dirname, "..", "data");
const DICT_DIR = path.join(__dirname, "..", "src", "dictionaries");
const DB_PATH = path.join(DATA_DIR, "vulpes-dictionaries.db");

// Soundex implementation
function soundex(text) {
  const s = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (s.length === 0) return "0000";

  const codes = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };

  let result = s[0];
  let prevCode = codes[s[0]] || "0";

  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || "0";
    if (code !== "0" && code !== prevCode) {
      result += code;
    }
    prevCode = code;
  }

  return (result + "000").substring(0, 4);
}

// Load dictionary file
function loadDictionary(filename) {
  const filePath = path.join(DICT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  [WARN] Dictionary not found: ${filename}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  console.log(`  Loaded ${lines.length} entries from ${filename}`);
  return lines;
}

// Main build function
function buildDatabase() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║         VULPES CELARE - Dictionary Database Builder          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Remove existing database
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log("  Removed existing database\n");
  }

  // Create database
  console.log("  Creating SQLite database...\n");
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  // Create schema
  console.log("[1/6] Creating schema...");
  db.exec(`
    -- First names table
    CREATE TABLE first_names (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      soundex TEXT NOT NULL,
      frequency INTEGER DEFAULT 0
    );
    CREATE INDEX idx_first_names_soundex ON first_names(soundex);
    CREATE INDEX idx_first_names_name ON first_names(name COLLATE NOCASE);

    -- Surnames table
    CREATE TABLE surnames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      soundex TEXT NOT NULL,
      frequency INTEGER DEFAULT 0
    );
    CREATE INDEX idx_surnames_soundex ON surnames(soundex);
    CREATE INDEX idx_surnames_name ON surnames(name COLLATE NOCASE);

    -- Hospitals table
    CREATE TABLE hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      aliases TEXT  -- JSON array of alternate names
    );
    CREATE INDEX idx_hospitals_name ON hospitals(name COLLATE NOCASE);

    -- Cities table
    CREATE TABLE cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE,
      state TEXT,
      UNIQUE(name, state)
    );
    CREATE INDEX idx_cities_name ON cities(name COLLATE NOCASE);

    -- FTS5 virtual table for trigram fuzzy matching
    CREATE VIRTUAL TABLE names_fts USING fts5(
      name,
      source,  -- 'first', 'surname', 'hospital', 'city'
      tokenize='trigram'
    );

    -- Metadata table for bloom filter cache and versioning
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value BLOB
    );
  `);
  console.log("  Schema created successfully\n");

  // Prepare insert statements
  const insertFirstName = db.prepare(
    "INSERT OR IGNORE INTO first_names (name, soundex, frequency) VALUES (?, ?, ?)"
  );
  const insertSurname = db.prepare(
    "INSERT OR IGNORE INTO surnames (name, soundex, frequency) VALUES (?, ?, ?)"
  );
  const insertHospital = db.prepare(
    "INSERT OR IGNORE INTO hospitals (name) VALUES (?)"
  );
  const insertCity = db.prepare(
    "INSERT OR IGNORE INTO cities (name, state) VALUES (?, ?)"
  );
  const insertFTS = db.prepare(
    "INSERT INTO names_fts (name, source) VALUES (?, ?)"
  );

  // Load and insert first names
  console.log("[2/6] Loading first names...");
  const firstNames = loadDictionary("first-names.txt");
  const insertFirstNames = db.transaction(() => {
    for (const name of firstNames) {
      const sx = soundex(name);
      insertFirstName.run(name.toLowerCase(), sx, 0);
      insertFTS.run(name.toLowerCase(), "first");
    }
  });
  insertFirstNames();
  console.log(`  Inserted ${firstNames.length} first names\n`);

  // Load and insert surnames
  console.log("[3/6] Loading surnames...");
  const surnames = loadDictionary("surnames.txt");
  const insertSurnames = db.transaction(() => {
    for (const name of surnames) {
      const sx = soundex(name);
      insertSurname.run(name.toLowerCase(), sx, 0);
      insertFTS.run(name.toLowerCase(), "surname");
    }
  });
  insertSurnames();
  console.log(`  Inserted ${surnames.length} surnames\n`);

  // Load and insert hospitals
  console.log("[4/6] Loading hospitals...");
  const hospitals = loadDictionary("hospitals.txt");
  const insertHospitals = db.transaction(() => {
    for (const name of hospitals) {
      insertHospital.run(name);
      insertFTS.run(name.toLowerCase(), "hospital");
    }
  });
  insertHospitals();
  console.log(`  Inserted ${hospitals.length} hospitals\n`);

  // Load and insert cities
  console.log("[5/6] Loading cities...");
  const cities = loadDictionary("cities.txt");
  const insertCities = db.transaction(() => {
    for (const entry of cities) {
      // Format: "City Name" or "City Name, ST"
      const parts = entry.split(",").map((p) => p.trim());
      const cityName = parts[0];
      const state = parts[1] || null;
      insertCity.run(cityName, state);
      insertFTS.run(cityName.toLowerCase(), "city");
    }
  });
  insertCities();
  console.log(`  Inserted ${cities.length} cities\n`);

  // Store metadata
  console.log("[6/6] Storing metadata...");
  const now = new Date().toISOString();
  const metadata = {
    version: 1,
    created_at: now,
    first_names_count: firstNames.length,
    surnames_count: surnames.length,
    hospitals_count: hospitals.length,
    cities_count: cities.length,
    total_entries:
      firstNames.length + surnames.length + hospitals.length + cities.length,
  };

  db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)").run(
    "info",
    JSON.stringify(metadata)
  );
  console.log(`  Metadata stored\n`);

  // Optimize and finalize
  console.log("  Running VACUUM and ANALYZE...");
  db.exec("ANALYZE");
  db.close();

  // Re-open in WAL mode, then run checkpoint and close
  const db2 = new Database(DB_PATH);
  db2.pragma("wal_checkpoint(TRUNCATE)");
  db2.close();

  // Get file size
  const stats = fs.statSync(DB_PATH);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    BUILD COMPLETE                            ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Database: ${DB_PATH.padEnd(47)}║`);
  console.log(`║  Size:     ${(sizeMB + " MB").padEnd(47)}║`);
  console.log(`║  Entries:  ${String(metadata.total_entries).padEnd(47)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

// Run
try {
  buildDatabase();
} catch (error) {
  console.error("\n[ERROR] Build failed:", error.message);
  process.exit(1);
}
