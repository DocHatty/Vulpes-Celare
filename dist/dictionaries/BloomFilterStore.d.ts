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
interface BloomFilterMetadata {
    version: number;
    size: number;
    nbHashes: number;
    itemCount: number;
    fpRate: number;
    createdAt: string;
}
export declare class BloomFilterStore {
    /**
     * Serialize a BloomFilter to a Buffer for storage
     */
    static serialize(filter: BloomFilter, itemCount?: number): Buffer;
    /**
     * Deserialize a BloomFilter from a Buffer
     */
    static deserialize(data: Buffer): {
        filter: BloomFilter;
        metadata: BloomFilterMetadata;
    };
    /**
     * Save a BloomFilter to a file
     */
    static saveToFile(filter: BloomFilter, filePath: string, itemCount?: number): void;
    /**
     * Load a BloomFilter from a file
     */
    static loadFromFile(filePath: string): {
        filter: BloomFilter;
        metadata: BloomFilterMetadata;
    };
    /**
     * Check if a bloom filter file exists and is valid
     */
    static isValid(filePath: string): boolean;
    /**
     * Get metadata from a bloom filter file without loading the full filter
     */
    static getMetadata(filePath: string): BloomFilterMetadata | null;
    /**
     * Build and save a bloom filter from a list of terms
     * Convenience method for build scripts
     */
    static buildAndSave(terms: string[], filePath: string, errorRate?: number): BloomFilterMetadata;
}
export {};
//# sourceMappingURL=BloomFilterStore.d.ts.map