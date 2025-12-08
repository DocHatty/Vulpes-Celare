/**
 * VULPES CORTEX - COMPREHENSIVE PARQUET DATASET ANALYZER
 *
 * Architecture:
 * - OPTIONAL: Won't affect normal Vulpes tests
 * - ASYNC: Non-blocking, separate process
 * - CACHED: Load once, reuse many times
 * - BATCHED: Process in chunks for memory efficiency
 * - GRACEFUL: Works even if parquet/Python unavailable
 *
 * Features:
 * 1. Massive test expansion (60k documents)
 * 2. Missing pattern detection
 * 3. Dictionary expansion
 * 4. Adversarial test generation
 * 5. Benchmark reporting
 */

const { ParquetDatasetLoader } = require('./parquet-loader');
const { VulpesCelare } = require('../../../dist/VulpesCelare');
const fs = require('fs');
const path = require('path');

class ParquetAnalyzer {
    constructor(parquetDir, options = {}) {
        this.parquetDir = parquetDir;
        this.options = {
            batchSize: options.batchSize || 100, // Process 100 docs at a time
            parallel: options.parallel || 8,      // 8 parallel workers
            cacheDir: options.cacheDir || path.join(__dirname, '.cache'),
            ...options
        };

        this.loader = new ParquetDatasetLoader(parquetDir);
        this.engine = new VulpesCelare();
        this.results = {
            total: 0,
            processed: 0,
            truePositives: 0,
            falsePositives: 0,
            falseNegatives: 0,
            missedPatterns: new Map(),
            newDictionaryEntries: new Set(),
            adversarialCases: []
        };

        // Ensure cache dir exists
        if (!fs.existsSync(this.options.cacheDir)) {
            fs.mkdirSync(this.options.cacheDir, { recursive: true });
        }
    }

    /**
     * Run comprehensive analysis on parquet dataset
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Complete analysis results
     */
    async analyze(options = {}) {
        const {
            split = 'validation',  // Start with validation (5k docs) not train (50k)
            limit = null,
            skipCache = false
        } = options;

        console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║   VULPES PARQUET DATASET ANALYSIS                                    ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

        try {
            // Step 1: Load dataset (with caching)
            console.log(`[STEP 1] Loading ${split} dataset...`);
            const docs = await this._loadWithCache(split, limit, skipCache);
            this.results.total = docs.length;
            console.log(`  ✓ Loaded ${docs.length} documents\n`);

            // Step 2: Run Vulpes on all documents (batched)
            console.log('[STEP 2] Running Vulpes redaction (batched)...');
            await this._runVulpesBatched(docs);
            console.log(`  ✓ Processed ${this.results.processed} documents\n`);

            // Step 3: Analyze missing patterns
            console.log('[STEP 3] Analyzing missed patterns...');
            const missedAnalysis = await this._analyzeMissedPatterns();
            console.log(`  ✓ Found ${missedAnalysis.uniquePatterns} unique missed patterns\n`);

            // Step 4: Extract dictionary entries
            console.log('[STEP 4] Extracting dictionary candidates...');
            const dictExpansion = await this._extractDictionaryEntries(docs);
            console.log(`  ✓ Found ${dictExpansion.totalEntries} new dictionary entries\n`);

            // Step 5: Generate adversarial test cases
            console.log('[STEP 5] Generating adversarial test cases...');
            const adversarial = await this._generateAdversarialCases(docs);
            console.log(`  ✓ Generated ${adversarial.length} adversarial cases\n`);

            // Step 6: Calculate metrics
            console.log('[STEP 6] Calculating performance metrics...');
            const metrics = this._calculateMetrics();
            console.log(`  ✓ Metrics calculated\n`);

            // Step 7: Generate comprehensive report
            const report = this._generateReport({
                metrics,
                missedAnalysis,
                dictExpansion,
                adversarial,
                split,
                totalDocs: docs.length
            });

            return report;

        } catch (error) {
            if (error.message.includes('Python') || error.message.includes('parquet')) {
                console.error('\n⚠️  Parquet analysis unavailable (Python/pandas not installed)');
                console.error('   Normal Vulpes tests will continue to work.\n');
                return null;
            }
            throw error;
        }
    }

    /**
     * Load dataset with caching
     * @private
     */
    async _loadWithCache(split, limit, skipCache) {
        const cacheFile = path.join(this.options.cacheDir, `${split}_${limit || 'all'}.json`);

        if (!skipCache && fs.existsSync(cacheFile)) {
            console.log(`  Using cached data from ${cacheFile}`);
            return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        }

        const docs = await this.loader.load(split, limit);

        // Cache for next time
        fs.writeFileSync(cacheFile, JSON.stringify(docs));

        return docs;
    }

    /**
     * Run Vulpes on documents in batches (memory efficient)
     * @private
     */
    async _runVulpesBatched(docs) {
        const batchSize = this.options.batchSize;
        const batches = [];

        // Split into batches
        for (let i = 0; i < docs.length; i += batchSize) {
            batches.push(docs.slice(i, i + batchSize));
        }

        console.log(`  Processing in ${batches.length} batches of ${batchSize}...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const startTime = Date.now();

            // Process batch in parallel
            await Promise.all(batch.map(doc => this._processDocument(doc)));

            const elapsed = Date.now() - startTime;
            const docsPerSec = (batch.length / elapsed * 1000).toFixed(1);

            process.stdout.write(`\r  Batch ${i + 1}/${batches.length} complete (${docsPerSec} docs/sec)`);
        }

        console.log(); // New line after progress
    }

    /**
     * Process single document - compare Vulpes vs ground truth
     * @private
     */
    async _processDocument(doc) {
        try {
            // Run Vulpes
            const result = await this.engine.process(doc.text);

            // Get ground truth entities
            const groundTruth = doc.entities || [];

            // Compare
            this._compareResults(doc.text, result, groundTruth);

            this.results.processed++;

        } catch (error) {
            console.error(`\nError processing document ${doc.uid}: ${error.message}`);
        }
    }

    /**
     * Compare Vulpes results vs ground truth
     * @private
     */
    _compareResults(text, vulpesResult, groundTruth) {
        const vulpesSpans = new Set(
            vulpesResult.spans.map(span => `${span.start}:${span.end}:${span.label}`)
        );

        // Check each ground truth entity
        for (const gtEntity of groundTruth) {
            const entityText = gtEntity.entity;
            const entityTypes = gtEntity.types || [];

            // Find entity in text
            const pos = text.indexOf(entityText);
            if (pos === -1) continue;

            const gtSpan = `${pos}:${pos + entityText.length}`;

            // Check if Vulpes caught it (allow partial type match)
            const caught = Array.from(vulpesSpans).some(vSpan => {
                const [vStart, vEnd] = vSpan.split(':').map(Number);
                return (vStart <= pos && vEnd >= pos + entityText.length);
            });

            if (caught) {
                this.results.truePositives++;
            } else {
                this.results.falseNegatives++;

                // Record missed pattern
                const pattern = {
                    entity: entityText,
                    types: entityTypes,
                    context: this._getContext(text, entityText)
                };

                const key = `${entityTypes[0]}:${this._getPattern(entityText)}`;
                if (!this.results.missedPatterns.has(key)) {
                    this.results.missedPatterns.set(key, []);
                }
                this.results.missedPatterns.get(key).push(pattern);
            }
        }

        // Count false positives (Vulpes detected but not in ground truth)
        // Simplified - would need more sophisticated matching
        this.results.falsePositives += Math.max(0,
            vulpesResult.redactionCount - groundTruth.length
        );
    }

    /**
     * Analyze missed patterns to find actionable improvements
     * @private
     */
    async _analyzeMissedPatterns() {
        const analysis = {
            byType: new Map(),
            topMissed: [],
            uniquePatterns: this.results.missedPatterns.size
        };

        // Group by entity type
        for (const [key, examples] of this.results.missedPatterns.entries()) {
            const [type] = key.split(':');

            if (!analysis.byType.has(type)) {
                analysis.byType.set(type, []);
            }

            analysis.byType.get(type).push({
                pattern: key,
                count: examples.length,
                examples: examples.slice(0, 3) // Top 3 examples
            });
        }

        // Get top 10 most frequently missed
        analysis.topMissed = Array.from(this.results.missedPatterns.entries())
            .map(([key, examples]) => ({
                pattern: key,
                count: examples.length,
                examples: examples.slice(0, 3)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return analysis;
    }

    /**
     * Extract dictionary entries (names, locations, etc.)
     * @private
     */
    async _extractDictionaryEntries(docs) {
        const entries = {
            first_names: new Set(),
            last_names: new Set(),
            person_names: new Set(),
            locations: new Set(),
            cities: new Set(),
            countries: new Set(),
            totalEntries: 0
        };

        for (const doc of docs) {
            for (const entity of doc.entities || []) {
                const types = entity.types || [];
                const value = entity.entity;

                if (types.includes('first_name')) entries.first_names.add(value);
                if (types.includes('last_name')) entries.last_names.add(value);
                if (types.includes('person_name')) entries.person_names.add(value);
                if (types.includes('location')) entries.locations.add(value);
                if (types.includes('city')) entries.cities.add(value);
                if (types.includes('country')) entries.countries.add(value);
            }
        }

        // Calculate total
        for (const set of Object.values(entries)) {
            if (set instanceof Set) {
                entries.totalEntries += set.size;
            }
        }

        return entries;
    }

    /**
     * Generate adversarial test cases (rare/edge cases)
     * @private
     */
    async _generateAdversarialCases(docs) {
        const adversarial = [];

        // Find documents with high entity density
        const highDensity = docs
            .filter(doc => (doc.entities || []).length > 10)
            .slice(0, 20);

        adversarial.push(...highDensity.map(doc => ({
            type: 'high_density',
            text: doc.text,
            entities: doc.entities.length
        })));

        // Find rare patterns (appearing < 5 times)
        const patternCounts = new Map();
        for (const [pattern, examples] of this.results.missedPatterns.entries()) {
            if (examples.length < 5) {
                adversarial.push({
                    type: 'rare_pattern',
                    pattern,
                    examples: examples.slice(0, 2)
                });
            }
        }

        return adversarial.slice(0, 50); // Top 50
    }

    /**
     * Calculate performance metrics
     * @private
     */
    _calculateMetrics() {
        const tp = this.results.truePositives;
        const fp = this.results.falsePositives;
        const fn = this.results.falseNegatives;

        const sensitivity = tp / (tp + fn) * 100 || 0;
        const precision = tp / (tp + fp) * 100 || 0;
        const f1 = 2 * (precision * sensitivity) / (precision + sensitivity) || 0;

        return {
            sensitivity,
            precision,
            f1,
            truePositives: tp,
            falsePositives: fp,
            falseNegatives: fn,
            totalDocuments: this.results.total,
            processedDocuments: this.results.processed
        };
    }

    /**
     * Generate comprehensive report
     * @private
     */
    _generateReport(data) {
        const report = {
            summary: {
                dataset: data.split,
                totalDocuments: data.totalDocs,
                ...data.metrics
            },
            missedPatterns: {
                total: data.missedAnalysis.uniquePatterns,
                byType: Object.fromEntries(data.missedAnalysis.byType),
                topMissed: data.missedAnalysis.topMissed
            },
            dictionaryExpansion: {
                totalNewEntries: data.dictExpansion.totalEntries,
                byCategory: {
                    first_names: data.dictExpansion.first_names.size,
                    last_names: data.dictExpansion.last_names.size,
                    person_names: data.dictExpansion.person_names.size,
                    locations: data.dictExpansion.locations.size,
                    cities: data.dictExpansion.cities.size,
                    countries: data.dictExpansion.countries.size
                }
            },
            adversarialCases: {
                total: data.adversarial.length,
                cases: data.adversarial
            },
            recommendations: this._generateRecommendations(data)
        };

        return report;
    }

    /**
     * Generate actionable recommendations
     * @private
     */
    _generateRecommendations(data) {
        const recommendations = [];

        // Recommendation 1: Top missed patterns
        if (data.missedAnalysis.topMissed.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Missing Patterns',
                action: 'Add filters or patterns for top missed entity types',
                details: data.missedAnalysis.topMissed.slice(0, 5).map(m => ({
                    pattern: m.pattern,
                    occurrences: m.count,
                    example: m.examples[0]?.entity
                }))
            });
        }

        // Recommendation 2: Dictionary expansion
        if (data.dictExpansion.totalEntries > 1000) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Dictionary Expansion',
                action: `Add ${data.dictExpansion.totalEntries} new entries to dictionaries`,
                details: {
                    first_names: data.dictExpansion.first_names.size,
                    last_names: data.dictExpansion.last_names.size,
                    locations: data.dictExpansion.locations.size
                }
            });
        }

        // Recommendation 3: Adversarial testing
        if (data.adversarial.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Adversarial Testing',
                action: 'Add edge cases to test suite',
                details: {
                    high_density_docs: data.adversarial.filter(c => c.type === 'high_density').length,
                    rare_patterns: data.adversarial.filter(c => c.type === 'rare_pattern').length
                }
            });
        }

        return recommendations;
    }

    /**
     * Helper: Get pattern from entity text
     * @private
     */
    _getPattern(text) {
        // Simple pattern extraction (can be improved)
        return text
            .replace(/\d/g, 'N')
            .replace(/[A-Z]/g, 'A')
            .replace(/[a-z]/g, 'a')
            .substring(0, 20);
    }

    /**
     * Helper: Get context around entity
     * @private
     */
    _getContext(text, entity, len = 30) {
        const idx = text.indexOf(entity);
        if (idx === -1) return null;

        return {
            before: text.substring(Math.max(0, idx - len), idx),
            entity,
            after: text.substring(idx + entity.length, Math.min(text.length, idx + entity.length + len))
        };
    }
}

module.exports = { ParquetAnalyzer };
