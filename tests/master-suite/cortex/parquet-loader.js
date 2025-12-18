/**
 * VULPES CORTEX - PARQUET DATASET LOADER
 *
 * Loads external parquet datasets (60k+ labeled documents) for:
 * 1. Massive test expansion
 * 2. Missing pattern detection
 * 3. Dictionary expansion
 * 4. Adversarial test generation
 * 5. Industry benchmark comparison
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ParquetDatasetLoader {
    constructor(parquetDir) {
        this.parquetDir = parquetDir;
        this.pythonScript = path.join(__dirname, 'scripts', 'load-parquet.py');
        this.cache = {
            train: null,
            validation: null,
            test: null
        };
    }

    /**
     * Load parquet dataset via Python bridge
     * @param {string} split - 'train', 'validation', or 'test'
     * @param {number} limit - Max documents to load (null for all)
     * @returns {Promise<Array>} Documents with ground truth labels
     */
    async load(split = 'train', limit = null) {
        // Check cache
        if (this.cache[split] && !limit) {
            return this.cache[split];
        }

        console.log(`Loading ${split} dataset from parquet...`);

        const parquetFile = path.join(
            this.parquetDir,
            `${split}-00000-of-00001.parquet`
        );

        if (!fs.existsSync(parquetFile)) {
            throw new Error(`Parquet file not found: ${parquetFile}`);
        }

        // Call Python script to load parquet
        const docs = await this._loadViaPython(parquetFile, limit);

        // Cache if loading all
        if (!limit) {
            this.cache[split] = docs;
        }

        console.log(`Loaded ${docs.length} documents from ${split} set`);

        return docs;
    }

    /**
     * Load all splits
     * @returns {Promise<Object>} { train, validation, test }
     */
    async loadAll(limit = null) {
        const [train, validation, test] = await Promise.all([
            this.load('train', limit),
            this.load('validation', limit),
            this.load('test', limit)
        ]);

        return { train, validation, test };
    }

    /**
     * Get dataset statistics
     */
    async getStats() {
        const datasets = await this.loadAll();

        const stats = {};
        for (const [split, docs] of Object.entries(datasets)) {
            const entityTypes = new Set();
            const domains = new Set();
            const docTypes = new Set();
            let totalEntities = 0;

            for (const doc of docs) {
                if (doc.domain) domains.add(doc.domain);
                if (doc.document_type) docTypes.add(doc.document_type);

                for (const entity of doc.entities || []) {
                    for (const type of entity.types || []) {
                        entityTypes.add(type);
                    }
                    totalEntities++;
                }
            }

            stats[split] = {
                documents: docs.length,
                totalEntities,
                avgEntitiesPerDoc: (totalEntities / docs.length).toFixed(2),
                entityTypes: Array.from(entityTypes).sort(),
                domains: Array.from(domains).sort(),
                documentTypes: Array.from(docTypes).sort()
            };
        }

        return stats;
    }

    /**
     * Extract all entities of a specific type
     * @param {string} entityType - e.g., 'first_name', 'date', 'medical_record_number'
     * @returns {Promise<Set>} Unique entities
     */
    async extractEntities(entityType) {
        const datasets = await this.loadAll();
        const entities = new Set();

        for (const docs of Object.values(datasets)) {
            for (const doc of docs) {
                for (const entity of doc.entities || []) {
                    if (entity.types.includes(entityType)) {
                        entities.add(entity.entity);
                    }
                }
            }
        }

        return entities;
    }

    /**
     * Find rare or unusual patterns
     * @param {string} entityType - Entity type to analyze
     * @param {number} threshold - Min occurrences to be considered common
     * @returns {Promise<Array>} Rare patterns with examples
     */
    async findRarePatterns(entityType, threshold = 5) {
        const datasets = await this.loadAll();
        const patternCounts = new Map();
        const patternExamples = new Map();

        for (const docs of Object.values(datasets)) {
            for (const doc of docs) {
                for (const entity of doc.entities || []) {
                    if (entity.types.includes(entityType)) {
                        const value = entity.entity;
                        patternCounts.set(value, (patternCounts.get(value) || 0) + 1);

                        if (!patternExamples.has(value)) {
                            patternExamples.set(value, {
                                value,
                                context: this._getContext(doc.text, value)
                            });
                        }
                    }
                }
            }
        }

        // Filter rare patterns
        const rare = [];
        for (const [pattern, count] of patternCounts.entries()) {
            if (count < threshold) {
                rare.push({
                    pattern,
                    count,
                    example: patternExamples.get(pattern)
                });
            }
        }

        return rare.sort((a, b) => a.count - b.count);
    }

    /**
     * Call Python script to load parquet file
     * @private
     */
    _loadViaPython(parquetFile, limit) {
        return new Promise((resolve, reject) => {
            // Ensure Python script exists, create if not
            this._ensurePythonScript();

            const args = [this.pythonScript, parquetFile];
            if (limit) args.push('--limit', limit.toString());

            const python = spawn('python', args);

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python script failed: ${stderr}`));
                } else {
                    try {
                        const docs = JSON.parse(stdout);
                        resolve(docs);
                    } catch (err) {
                        reject(new Error(`Failed to parse JSON: ${err.message}\nOutput: ${stdout.substring(0, 500)}`));
                    }
                }
            });
        });
    }

    /**
     * Get context around an entity in text
     * @private
     */
    _getContext(text, entity, contextLen = 50) {
        const idx = text.indexOf(entity);
        if (idx === -1) return null;

        const start = Math.max(0, idx - contextLen);
        const end = Math.min(text.length, idx + entity.length + contextLen);

        return {
            before: text.substring(start, idx),
            entity,
            after: text.substring(idx + entity.length, end)
        };
    }

    /**
     * Ensure Python loader script exists
     * @private
     */
    _ensurePythonScript() {
        const scriptsDir = path.join(__dirname, 'scripts');
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        if (!fs.existsSync(this.pythonScript)) {
            // Will be created separately
            throw new Error(`Python script not found: ${this.pythonScript}`);
        }
    }
}

module.exports = { ParquetDatasetLoader };
