/**
 * BloomFilterStore - Serialization and persistence for Bloom Filters
 *
 * Enables saving pre-built bloom filters to disk for faster cold starts.
 * Instead of rebuilding the filter from dictionary entries on every startup,
 * we can load a pre-computed filter in ~1ms.
 *
 * STORAGE FORMAT:
 * - Header: 8 bytes (magic number + version)
 * - Metadata: Variable (JSON with filter parameters)
 * - Data: Raw bit array
 *
 * @module redaction/dictionaries
 */

import { BloomFilter } from "bloom-filters";
import * as fs from "fs";
import * as path from "path";

// Magic number: "VBLM" (Vulpes BLooM)
const MAGIC_NUMBER = Buffer.from([0x56, 0x42, 0x4c, 0x4d]);
const VERSION = 1;

interface BloomFilterMetadata {
  version: number;
  size: number; // Number of bits
  nbHashes: number; // Number of hash functions
  itemCount: number; // Approximate items inserted
  fpRate: number; // Target false positive rate
  createdAt: string; // ISO timestamp
}

export class BloomFilterStore {
  /**
   * Serialize a BloomFilter to a Buffer for storage
   */
  static serialize(filter: BloomFilter, itemCount: number = 0): Buffer {
    // Export filter to JSON (includes _filter bit array and parameters)
    const exported = filter.saveAsJSON();

    const metadata: BloomFilterMetadata = {
      version: VERSION,
      size: exported._size,
      nbHashes: exported._nbHashes,
      itemCount,
      fpRate: exported._errorRate || 0.001,
      createdAt: new Date().toISOString(),
    };

    const metadataJson = JSON.stringify(metadata);
    const metadataBuffer = Buffer.from(metadataJson, "utf8");
    const filterJson = JSON.stringify(exported);
    const filterBuffer = Buffer.from(filterJson, "utf8");

    // Calculate total size
    // Header: 4 (magic) + 1 (version) + 4 (metadata length) + 4 (filter length)
    const headerSize = 13;
    const totalSize =
      headerSize + metadataBuffer.length + filterBuffer.length;

    const result = Buffer.alloc(totalSize);
    let offset = 0;

    // Write magic number
    MAGIC_NUMBER.copy(result, offset);
    offset += 4;

    // Write version
    result.writeUInt8(VERSION, offset);
    offset += 1;

    // Write metadata length and data
    result.writeUInt32LE(metadataBuffer.length, offset);
    offset += 4;
    metadataBuffer.copy(result, offset);
    offset += metadataBuffer.length;

    // Write filter length and data
    result.writeUInt32LE(filterBuffer.length, offset);
    offset += 4;
    filterBuffer.copy(result, offset);

    return result;
  }

  /**
   * Deserialize a BloomFilter from a Buffer
   */
  static deserialize(data: Buffer): {
    filter: BloomFilter;
    metadata: BloomFilterMetadata;
  } {
    let offset = 0;

    // Verify magic number
    const magic = data.subarray(offset, offset + 4);
    if (!magic.equals(MAGIC_NUMBER)) {
      throw new Error("Invalid bloom filter file: bad magic number");
    }
    offset += 4;

    // Read version
    const version = data.readUInt8(offset);
    if (version !== VERSION) {
      throw new Error(
        `Unsupported bloom filter version: ${version} (expected ${VERSION})`,
      );
    }
    offset += 1;

    // Read metadata
    const metadataLength = data.readUInt32LE(offset);
    offset += 4;
    const metadataJson = data
      .subarray(offset, offset + metadataLength)
      .toString("utf8");
    const metadata: BloomFilterMetadata = JSON.parse(metadataJson);
    offset += metadataLength;

    // Read filter
    const filterLength = data.readUInt32LE(offset);
    offset += 4;
    const filterJson = data
      .subarray(offset, offset + filterLength)
      .toString("utf8");
    const filterData = JSON.parse(filterJson);

    // Reconstruct the bloom filter
    const filter = BloomFilter.fromJSON(filterData);

    return { filter, metadata };
  }

  /**
   * Save a BloomFilter to a file
   */
  static saveToFile(
    filter: BloomFilter,
    filePath: string,
    itemCount: number = 0,
  ): void {
    const buffer = BloomFilterStore.serialize(filter, itemCount);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
  }

  /**
   * Load a BloomFilter from a file
   */
  static loadFromFile(filePath: string): {
    filter: BloomFilter;
    metadata: BloomFilterMetadata;
  } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bloom filter file not found: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    return BloomFilterStore.deserialize(buffer);
  }

  /**
   * Check if a bloom filter file exists and is valid
   */
  static isValid(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const buffer = fs.readFileSync(filePath);
      if (buffer.length < 13) {
        return false;
      }

      // Check magic number
      const magic = buffer.subarray(0, 4);
      if (!magic.equals(MAGIC_NUMBER)) {
        return false;
      }

      // Check version
      const version = buffer.readUInt8(4);
      if (version !== VERSION) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata from a bloom filter file without loading the full filter
   */
  static getMetadata(filePath: string): BloomFilterMetadata | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = fs.readFileSync(filePath);

      // Skip magic (4) + version (1)
      let offset = 5;

      // Read metadata length
      const metadataLength = buffer.readUInt32LE(offset);
      offset += 4;

      // Read metadata JSON
      const metadataJson = buffer
        .subarray(offset, offset + metadataLength)
        .toString("utf8");

      return JSON.parse(metadataJson);
    } catch {
      return null;
    }
  }

  /**
   * Build and save a bloom filter from a list of terms
   * Convenience method for build scripts
   */
  static buildAndSave(
    terms: string[],
    filePath: string,
    errorRate: number = 0.001,
  ): BloomFilterMetadata {
    const normalizedTerms = terms
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0);

    const filter = BloomFilter.from(normalizedTerms, errorRate);

    BloomFilterStore.saveToFile(filter, filePath, normalizedTerms.length);

    return {
      version: VERSION,
      size: (filter as unknown as { _size: number })._size,
      nbHashes: (filter as unknown as { _nbHashes: number })._nbHashes,
      itemCount: normalizedTerms.length,
      fpRate: errorRate,
      createdAt: new Date().toISOString(),
    };
  }
}
