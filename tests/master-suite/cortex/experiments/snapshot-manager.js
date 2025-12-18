/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   SNAPSHOT MANAGER                                                            ║
 * ║   Document Versioning for Reproducible Testing                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * PROBLEM: Without snapshots, A/B testing is unreliable
 * - Document corpus may change between runs
 * - Random sampling gives different results
 * - Can't reproduce past experiment conditions
 *
 * SOLUTION: Snapshot everything
 * - Document snapshots: Exact documents used in each experiment
 * - Config snapshots: System configuration at time of test
 * - Codebase snapshots: Hash of all filter/dictionary files
 *
 * SNAPSHOT TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * DOCUMENT_SET     - List of document IDs and their content hashes
 * CONFIG           - Full system configuration
 * CODEBASE         - Hashes of all source files
 * FULL             - All of the above combined
 *
 * This enables:
 * - Exact reproduction of any past experiment
 * - Fair A/B comparisons on identical documents
 * - Tracking what changed between experiments
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PATHS } = require("../core/config");

// ============================================================================
// SNAPSHOT MANAGER CLASS
// ============================================================================

class SnapshotManager {
  constructor(options = {}) {
    this.codebaseAnalyzer = options.codebaseAnalyzer || null;
    this.storagePath = path.join(PATHS.snapshots, "snapshots.json");
    this.snapshotDir = PATHS.snapshots;
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("SnapshotManager: Starting with empty snapshot registry");
    }
    return {
      snapshots: [],
      index: {}, // Quick lookup by ID
      stats: {
        total: 0,
        byType: {},
      },
    };
  }

  saveData() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
  }

  // ==========================================================================
  // SNAPSHOT CREATION
  // ==========================================================================

  /**
   * Create a document set snapshot
   * @param {Array} documents - Array of document objects { id, content, ... }
   * @param {Object} metadata - Additional metadata
   */
  createDocumentSnapshot(documents, metadata = {}) {
    const snapshot = {
      id: `SNAP-DOC-${Date.now()}`,
      type: "DOCUMENT_SET",
      timestamp: new Date().toISOString(),
      metadata: {
        description: metadata.description || "Document snapshot",
        experimentId: metadata.experimentId || null,
        ...metadata,
      },
      documents: documents.map((doc) => ({
        id: doc.id || doc.filename || `doc-${Date.now()}`,
        contentHash: this.hashContent(doc.content || doc.text || ""),
        length: (doc.content || doc.text || "").length,
        annotations: doc.annotations || doc.groundTruth || [],
      })),
      stats: {
        documentCount: documents.length,
        totalLength: documents.reduce(
          (sum, d) => sum + (d.content || d.text || "").length,
          0,
        ),
        totalAnnotations: documents.reduce(
          (sum, d) => sum + (d.annotations || d.groundTruth || []).length,
          0,
        ),
      },
      hash: null, // Set below
    };

    // Overall hash for quick comparison
    snapshot.hash = this.hashContent(JSON.stringify(snapshot.documents));

    // Store full document content separately (if not too large)
    if (snapshot.stats.totalLength < 10 * 1024 * 1024) {
      // < 10MB
      const contentPath = path.join(
        this.snapshotDir,
        `${snapshot.id}-content.json`,
      );
      this.ensureDir(this.snapshotDir);
      fs.writeFileSync(
        contentPath,
        JSON.stringify(
          documents.map((d) => ({
            id: d.id || d.filename,
            content: d.content || d.text,
            annotations: d.annotations || d.groundTruth,
          })),
          null,
          2,
        ),
      );
      snapshot.contentPath = contentPath;
    }

    this.registerSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Create a configuration snapshot
   * @param {Object} config - Current system configuration
   */
  createConfigSnapshot(config, metadata = {}) {
    const snapshot = {
      id: `SNAP-CFG-${Date.now()}`,
      type: "CONFIG",
      timestamp: new Date().toISOString(),
      metadata: {
        description: metadata.description || "Configuration snapshot",
        ...metadata,
      },
      config: JSON.parse(JSON.stringify(config)), // Deep clone
      hash: this.hashContent(JSON.stringify(config)),
    };

    this.registerSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Create a codebase snapshot (hashes of all relevant files)
   */
  createCodebaseSnapshot(metadata = {}) {
    let fileHashes = {};

    if (this.codebaseAnalyzer) {
      const state = this.codebaseAnalyzer.takeSnapshot();
      fileHashes = state.fileHashes;
    } else {
      // Manual hash computation
      fileHashes = this.computeCodebaseHashes();
    }

    const snapshot = {
      id: `SNAP-CODE-${Date.now()}`,
      type: "CODEBASE",
      timestamp: new Date().toISOString(),
      metadata: {
        description: metadata.description || "Codebase snapshot",
        ...metadata,
      },
      fileHashes,
      stats: {
        fileCount: Object.keys(fileHashes).length,
      },
      hash: this.hashContent(JSON.stringify(fileHashes)),
    };

    this.registerSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Create a full snapshot (documents + config + codebase)
   */
  createFullSnapshot(documents, config, metadata = {}) {
    const docSnapshot = this.createDocumentSnapshot(documents, {
      ...metadata,
      temporary: true,
    });
    const cfgSnapshot = this.createConfigSnapshot(config, {
      ...metadata,
      temporary: true,
    });
    const codeSnapshot = this.createCodebaseSnapshot({
      ...metadata,
      temporary: true,
    });

    const snapshot = {
      id: `SNAP-FULL-${Date.now()}`,
      type: "FULL",
      timestamp: new Date().toISOString(),
      metadata: {
        description: metadata.description || "Full system snapshot",
        ...metadata,
      },
      components: {
        documentSnapshotId: docSnapshot.id,
        configSnapshotId: cfgSnapshot.id,
        codebaseSnapshotId: codeSnapshot.id,
      },
      stats: {
        documents: docSnapshot.stats.documentCount,
        files: codeSnapshot.stats.fileCount,
      },
      hash: this.hashContent(
        [docSnapshot.hash, cfgSnapshot.hash, codeSnapshot.hash].join(":"),
      ),
    };

    this.registerSnapshot(snapshot);
    return snapshot;
  }

  // ==========================================================================
  // SNAPSHOT RETRIEVAL
  // ==========================================================================

  /**
   * Get a snapshot by ID
   */
  getSnapshot(id) {
    return this.data.index[id] || null;
  }

  /**
   * Get the documents from a document snapshot
   */
  getDocumentsFromSnapshot(snapshotId) {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot || snapshot.type !== "DOCUMENT_SET") {
      return null;
    }

    // Load from content file if exists
    if (snapshot.contentPath && fs.existsSync(snapshot.contentPath)) {
      return JSON.parse(fs.readFileSync(snapshot.contentPath, "utf8"));
    }

    // Return just the metadata if content not stored
    return snapshot.documents;
  }

  /**
   * Get snapshots by type
   */
  getSnapshotsByType(type) {
    return this.data.snapshots.filter((s) => s.type === type);
  }

  /**
   * Get recent snapshots
   */
  getRecentSnapshots(limit = 10) {
    return this.data.snapshots.slice(-limit).reverse();
  }

  /**
   * Find snapshots for an experiment
   */
  getSnapshotsForExperiment(experimentId) {
    return this.data.snapshots.filter(
      (s) => s.metadata?.experimentId === experimentId,
    );
  }

  // ==========================================================================
  // SNAPSHOT COMPARISON
  // ==========================================================================

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshotId1, snapshotId2) {
    const snap1 = this.getSnapshot(snapshotId1);
    const snap2 = this.getSnapshot(snapshotId2);

    if (!snap1 || !snap2) {
      throw new Error("One or both snapshots not found");
    }

    if (snap1.type !== snap2.type) {
      throw new Error("Cannot compare snapshots of different types");
    }

    const comparison = {
      snapshot1: snapshotId1,
      snapshot2: snapshotId2,
      type: snap1.type,
      identical: snap1.hash === snap2.hash,
      timestamp: new Date().toISOString(),
      differences: [],
    };

    if (comparison.identical) {
      return comparison;
    }

    // Type-specific comparison
    switch (snap1.type) {
      case "DOCUMENT_SET":
        comparison.differences = this.compareDocumentSnapshots(snap1, snap2);
        break;
      case "CODEBASE":
        comparison.differences = this.compareCodebaseSnapshots(snap1, snap2);
        break;
      case "CONFIG":
        comparison.differences = this.compareConfigSnapshots(snap1, snap2);
        break;
    }

    return comparison;
  }

  compareDocumentSnapshots(snap1, snap2) {
    const differences = [];
    const docs1 = new Map(snap1.documents.map((d) => [d.id, d]));
    const docs2 = new Map(snap2.documents.map((d) => [d.id, d]));

    // Check for added/removed/changed documents
    for (const [id, doc1] of docs1) {
      if (!docs2.has(id)) {
        differences.push({ type: "REMOVED", documentId: id });
      } else {
        const doc2 = docs2.get(id);
        if (doc1.contentHash !== doc2.contentHash) {
          differences.push({
            type: "MODIFIED",
            documentId: id,
            lengthDelta: doc2.length - doc1.length,
          });
        }
      }
    }

    for (const id of docs2.keys()) {
      if (!docs1.has(id)) {
        differences.push({ type: "ADDED", documentId: id });
      }
    }

    return differences;
  }

  compareCodebaseSnapshots(snap1, snap2) {
    const differences = [];
    const files1 = snap1.fileHashes || {};
    const files2 = snap2.fileHashes || {};

    const allFiles = new Set([...Object.keys(files1), ...Object.keys(files2)]);

    for (const file of allFiles) {
      if (!files1[file]) {
        differences.push({ type: "ADDED", file });
      } else if (!files2[file]) {
        differences.push({ type: "REMOVED", file });
      } else if (files1[file] !== files2[file]) {
        differences.push({ type: "MODIFIED", file });
      }
    }

    return differences;
  }

  compareConfigSnapshots(snap1, snap2) {
    const differences = [];

    const compareObjects = (obj1, obj2, path = "") => {
      const keys = new Set([
        ...Object.keys(obj1 || {}),
        ...Object.keys(obj2 || {}),
      ]);

      for (const key of keys) {
        const fullPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];

        if (val1 === undefined && val2 !== undefined) {
          differences.push({ type: "ADDED", path: fullPath, value: val2 });
        } else if (val1 !== undefined && val2 === undefined) {
          differences.push({ type: "REMOVED", path: fullPath, value: val1 });
        } else if (typeof val1 === "object" && typeof val2 === "object") {
          compareObjects(val1, val2, fullPath);
        } else if (val1 !== val2) {
          differences.push({
            type: "MODIFIED",
            path: fullPath,
            from: val1,
            to: val2,
          });
        }
      }
    };

    compareObjects(snap1.config, snap2.config);
    return differences;
  }

  // ==========================================================================
  // SNAPSHOT VALIDATION
  // ==========================================================================

  /**
   * Verify a snapshot matches current state
   */
  verifySnapshot(snapshotId) {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      return { valid: false, reason: "Snapshot not found" };
    }

    const verification = {
      snapshotId,
      timestamp: new Date().toISOString(),
      valid: true,
      discrepancies: [],
    };

    switch (snapshot.type) {
      case "CODEBASE":
        const currentHashes = this.computeCodebaseHashes();
        for (const [file, hash] of Object.entries(snapshot.fileHashes || {})) {
          if (currentHashes[file] !== hash) {
            verification.discrepancies.push({
              file,
              expected: hash,
              actual: currentHashes[file] || "MISSING",
            });
          }
        }
        break;

      case "DOCUMENT_SET":
        // Verify content file exists and matches
        if (snapshot.contentPath && !fs.existsSync(snapshot.contentPath)) {
          verification.discrepancies.push({
            type: "CONTENT_MISSING",
            path: snapshot.contentPath,
          });
        }
        break;
    }

    verification.valid = verification.discrepancies.length === 0;
    return verification;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  registerSnapshot(snapshot) {
    this.data.snapshots.push(snapshot);
    this.data.index[snapshot.id] = snapshot;
    this.data.stats.total++;
    this.data.stats.byType[snapshot.type] =
      (this.data.stats.byType[snapshot.type] || 0) + 1;
    this.saveData();
  }

  hashContent(content) {
    if (typeof content !== "string") {
      content = JSON.stringify(content);
    }
    return crypto
      .createHash("sha256")
      .update(content)
      .digest("hex")
      .substring(0, 16);
  }

  computeCodebaseHashes() {
    const hashes = {};
    const srcDir = path.join(__dirname, "..", "..", "..", "..", "src");

    const dirsToHash = [
      path.join(srcDir, "filters"),
      path.join(srcDir, "dictionaries"),
      path.join(srcDir, "core"),
    ];

    for (const dir of dirsToHash) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter(
          (f) => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".txt"),
        );

      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(srcDir, filePath);
        hashes[relativePath] = this.hashFile(filePath);
      }
    }

    return hashes;
  }

  hashFile(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto
        .createHash("md5")
        .update(content)
        .digest("hex")
        .substring(0, 12);
    } catch (e) {
      return "error";
    }
  }

  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Clean up old snapshots
   */
  cleanup(options = {}) {
    const maxAge = options.maxAgeDays || 30;
    const keepMinimum = options.keepMinimum || 10;
    const cutoff = Date.now() - maxAge * 24 * 60 * 60 * 1000;

    const toRemove = [];

    // Don't remove if we'd go below minimum
    if (this.data.snapshots.length <= keepMinimum) {
      return { removed: 0 };
    }

    for (const snapshot of this.data.snapshots) {
      const age = new Date(snapshot.timestamp).getTime();
      if (
        age < cutoff &&
        this.data.snapshots.length - toRemove.length > keepMinimum
      ) {
        toRemove.push(snapshot.id);

        // Remove content file if exists
        if (snapshot.contentPath && fs.existsSync(snapshot.contentPath)) {
          try {
            fs.unlinkSync(snapshot.contentPath);
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }
    }

    // Remove from data
    this.data.snapshots = this.data.snapshots.filter(
      (s) => !toRemove.includes(s.id),
    );
    for (const id of toRemove) {
      delete this.data.index[id];
    }

    this.saveData();
    return { removed: toRemove.length };
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.data.stats,
      recentSnapshots: this.getRecentSnapshots(5).map((s) => ({
        id: s.id,
        type: s.type,
        timestamp: s.timestamp,
        hash: s.hash,
      })),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SnapshotManager,
};
