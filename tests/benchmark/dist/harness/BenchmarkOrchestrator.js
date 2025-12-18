"use strict";
/**
 * ============================================================================
 * BENCHMARK ORCHESTRATOR
 * ============================================================================
 *
 * Central coordinator for benchmark runs.
 * Manages backend execution, result collection, and comparison.
 *
 * @module benchmark/harness/BenchmarkOrchestrator
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkOrchestrator = void 0;
exports.createOrchestrator = createOrchestrator;
const HermeticEnvironment_1 = require("./HermeticEnvironment");
const BackendFactory_1 = require("../backends/BackendFactory");
const crypto = __importStar(require("crypto"));
/**
 * Benchmark orchestrator - coordinates benchmark execution
 */
class BenchmarkOrchestrator {
    config;
    hermeticEnv;
    factory = (0, BackendFactory_1.getBackendFactory)();
    constructor(config = {}) {
        this.config = {
            backends: config.backends || ['rules', 'hybrid'],
            seed: config.seed ?? 1337,
            documentCount: config.documentCount ?? 50,
            corpus: config.corpus || 'synthetic',
            profile: config.profile || 'HIPAA_STRICT',
            saveToLeaderboard: config.saveToLeaderboard ?? false,
            verbose: config.verbose ?? false,
        };
        this.hermeticEnv = new HermeticEnvironment_1.HermeticEnvironment();
    }
    /**
     * Generate experiment ID
     */
    generateExperimentId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `exp-${timestamp}-${random}`;
    }
    /**
     * Generate experiment hash for reproducibility verification
     */
    generateExperimentHash(config, documentIds) {
        const data = JSON.stringify({
            backends: config.backends.sort(),
            seed: config.seed,
            documentCount: config.documentCount,
            corpus: config.corpus,
            profile: config.profile,
            documentIds: documentIds.sort(),
        });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    /**
     * Run benchmark across all configured backends
     */
    async run(documents) {
        const experimentId = this.generateExperimentId();
        const documentIds = documents.map(d => d.id);
        const experimentHash = this.generateExperimentHash(this.config, documentIds);
        if (this.config.verbose) {
            console.log(`\n[BenchmarkOrchestrator] Starting experiment ${experimentId}`);
            console.log(`  Hash: ${experimentHash}`);
            console.log(`  Backends: ${this.config.backends.join(', ')}`);
            console.log(`  Documents: ${documents.length}`);
            console.log(`  Profile: ${this.config.profile}`);
        }
        const backendResults = new Map();
        // Run each backend in isolation
        for (const backendType of this.config.backends) {
            if (this.config.verbose) {
                console.log(`\n[BenchmarkOrchestrator] Running ${backendType} backend...`);
            }
            try {
                const result = await this.runBackend(backendType, documents);
                backendResults.set(backendType, result);
                if (this.config.verbose) {
                    console.log(`  Completed: ${result.documentsProcessed} docs in ${result.totalTimeMs.toFixed(0)}ms`);
                    console.log(`  Spans detected: ${result.totalSpansDetected}`);
                    console.log(`  Errors: ${result.errors.length}`);
                }
            }
            catch (error) {
                console.error(`[BenchmarkOrchestrator] Error running ${backendType}:`, error);
                // Continue with other backends
            }
        }
        return {
            experimentId,
            experimentHash,
            timestamp: new Date(),
            config: this.config,
            backendResults,
            documentIds,
        };
    }
    /**
     * Run a single backend with hermetic isolation
     */
    async runBackend(backendType, documents) {
        const envConfig = HermeticEnvironment_1.HermeticEnvironment.getEnvironmentForMode(backendType);
        return this.hermeticEnv.runIsolated(envConfig, async () => {
            const backend = this.factory.createByType(backendType);
            await backend.initialize();
            const detectionResults = [];
            const errors = [];
            let totalSpansDetected = 0;
            const startTime = performance.now();
            for (const doc of documents) {
                try {
                    const result = await backend.detect(doc);
                    detectionResults.push(result);
                    totalSpansDetected += result.spans.length;
                }
                catch (error) {
                    errors.push({
                        documentId: doc.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            const totalTimeMs = performance.now() - startTime;
            await backend.shutdown();
            return {
                backendId: backend.id,
                backendType,
                detectionResults,
                totalTimeMs,
                avgTimeMs: totalTimeMs / documents.length,
                documentsProcessed: detectionResults.length,
                totalSpansDetected,
                errors,
                configuration: backend.getConfiguration(),
            };
        });
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Check which backends are available
     */
    async getAvailableBackends() {
        const available = [];
        for (const metadata of BackendFactory_1.AVAILABLE_BACKENDS) {
            const isAvailable = await this.factory.isAvailable(metadata.id);
            if (isAvailable) {
                available.push(metadata.type);
            }
        }
        return available;
    }
    /**
     * Generate a simple comparison summary
     */
    static generateSummary(results) {
        const lines = [];
        lines.push('═'.repeat(60));
        lines.push(`BENCHMARK SUMMARY`);
        lines.push(`Experiment: ${results.experimentId}`);
        lines.push(`Hash: ${results.experimentHash}`);
        lines.push(`Time: ${results.timestamp.toISOString()}`);
        lines.push('═'.repeat(60));
        lines.push('');
        lines.push('┌────────────────┬────────────┬───────────┬───────────┐');
        lines.push('│ Backend        │ Docs       │ Spans     │ Time (ms) │');
        lines.push('├────────────────┼────────────┼───────────┼───────────┤');
        for (const [backendType, result] of results.backendResults) {
            const name = backendType.padEnd(14);
            const docs = result.documentsProcessed.toString().padStart(10);
            const spans = result.totalSpansDetected.toString().padStart(9);
            const time = result.totalTimeMs.toFixed(0).padStart(9);
            lines.push(`│ ${name} │${docs} │${spans} │${time} │`);
        }
        lines.push('└────────────────┴────────────┴───────────┴───────────┘');
        return lines.join('\n');
    }
}
exports.BenchmarkOrchestrator = BenchmarkOrchestrator;
/**
 * Create orchestrator with default config
 */
function createOrchestrator(config) {
    return new BenchmarkOrchestrator(config);
}
//# sourceMappingURL=BenchmarkOrchestrator.js.map