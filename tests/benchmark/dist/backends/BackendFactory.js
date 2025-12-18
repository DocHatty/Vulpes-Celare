"use strict";
/**
 * ============================================================================
 * BACKEND FACTORY
 * ============================================================================
 *
 * Factory for creating and managing detection backends.
 * Provides unified access to all backend implementations.
 *
 * @module benchmark/backends/BackendFactory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlinerOnlyBackend = exports.HybridBackend = exports.RulesOnlyBackend = exports.AVAILABLE_BACKENDS = void 0;
exports.getBackendFactory = getBackendFactory;
exports.createIsolatedBackend = createIsolatedBackend;
exports.detectWithIsolation = detectWithIsolation;
const RulesOnlyBackend_1 = require("./RulesOnlyBackend");
Object.defineProperty(exports, "RulesOnlyBackend", { enumerable: true, get: function () { return RulesOnlyBackend_1.RulesOnlyBackend; } });
const HybridBackend_1 = require("./HybridBackend");
Object.defineProperty(exports, "HybridBackend", { enumerable: true, get: function () { return HybridBackend_1.HybridBackend; } });
const GlinerOnlyBackend_1 = require("./GlinerOnlyBackend");
Object.defineProperty(exports, "GlinerOnlyBackend", { enumerable: true, get: function () { return GlinerOnlyBackend_1.GlinerOnlyBackend; } });
const HermeticEnvironment_1 = require("../harness/HermeticEnvironment");
/**
 * All available backends
 */
exports.AVAILABLE_BACKENDS = [
    {
        id: 'vulpes-rules-v1',
        name: 'Rules Only',
        type: 'rules',
        description: 'Regex/dictionary-based detection using 28 span filters',
        requiresGliner: false,
        requiresGPU: false,
    },
    {
        id: 'vulpes-hybrid-v1',
        name: 'Hybrid (Rules + GLiNER)',
        type: 'hybrid',
        description: 'Combined rules and GLiNER ML for best coverage',
        requiresGliner: true,
        requiresGPU: false,
    },
    {
        id: 'vulpes-gliner-v1',
        name: 'GLiNER Only',
        type: 'gliner',
        description: 'Pure ML-based zero-shot NER detection',
        requiresGliner: true,
        requiresGPU: false,
    },
];
/**
 * Backend factory implementation
 */
class BackendFactoryImpl {
    factories = new Map();
    instances = new Map();
    constructor() {
        // Register built-in backends
        this.register('vulpes-rules-v1', RulesOnlyBackend_1.createRulesOnlyBackend);
        this.register('vulpes-hybrid-v1', HybridBackend_1.createHybridBackend);
        this.register('vulpes-gliner-v1', GlinerOnlyBackend_1.createGlinerOnlyBackend);
    }
    /**
     * Register a backend factory
     */
    register(id, factory) {
        this.factories.set(id, factory);
    }
    /**
     * Get a backend instance by ID
     * Returns cached instance if available
     */
    get(id) {
        // Return cached instance if exists
        if (this.instances.has(id)) {
            return this.instances.get(id);
        }
        // Create new instance
        const factory = this.factories.get(id);
        if (!factory) {
            return undefined;
        }
        const instance = factory();
        this.instances.set(id, instance);
        return instance;
    }
    /**
     * Get all registered backend IDs
     */
    list() {
        return Array.from(this.factories.keys());
    }
    /**
     * Create all backends (fresh instances)
     */
    createAll() {
        return Array.from(this.factories.values()).map(factory => factory());
    }
    /**
     * Create a backend by type
     */
    createByType(type) {
        switch (type) {
            case 'rules':
                return (0, RulesOnlyBackend_1.createRulesOnlyBackend)();
            case 'hybrid':
                return (0, HybridBackend_1.createHybridBackend)();
            case 'gliner':
                return (0, GlinerOnlyBackend_1.createGlinerOnlyBackend)();
            default:
                throw new Error(`Unknown backend type: ${type}`);
        }
    }
    /**
     * Get backend metadata
     */
    getMetadata(id) {
        return exports.AVAILABLE_BACKENDS.find(b => b.id === id);
    }
    /**
     * Get all backend metadata
     */
    getAllMetadata() {
        return [...exports.AVAILABLE_BACKENDS];
    }
    /**
     * Clear cached instances
     */
    clearCache() {
        for (const instance of this.instances.values()) {
            instance.shutdown().catch(() => { });
        }
        this.instances.clear();
    }
    /**
     * Check if a backend is available (dependencies met)
     */
    async isAvailable(id) {
        const metadata = this.getMetadata(id);
        if (!metadata)
            return false;
        // Rules backend is always available
        if (metadata.type === 'rules')
            return true;
        // Check GLiNER availability for ML backends
        if (metadata.requiresGliner) {
            const fs = require('fs');
            const path = require('path');
            const modelPath = process.env.VULPES_GLINER_MODEL_PATH ||
                path.join(process.cwd(), 'models', 'gliner', 'model.onnx');
            return fs.existsSync(modelPath);
        }
        return true;
    }
}
/**
 * Singleton factory instance
 */
const factoryInstance = new BackendFactoryImpl();
/**
 * Get the backend factory
 */
function getBackendFactory() {
    return factoryInstance;
}
/**
 * Create a backend with hermetic isolation
 */
async function createIsolatedBackend(type, hermeticEnv) {
    const env = hermeticEnv || new HermeticEnvironment_1.HermeticEnvironment();
    const config = HermeticEnvironment_1.HermeticEnvironment.getEnvironmentForMode(type);
    // Enter isolation
    await env.enterIsolation(config);
    try {
        // Create backend in isolated environment
        const backend = factoryInstance.createByType(type);
        await backend.initialize();
        return backend;
    }
    catch (error) {
        // Exit isolation on error
        await env.exitIsolation();
        throw error;
    }
}
/**
 * Run detection with hermetic isolation
 */
async function detectWithIsolation(type, fn) {
    const env = new HermeticEnvironment_1.HermeticEnvironment();
    const config = HermeticEnvironment_1.HermeticEnvironment.getEnvironmentForMode(type);
    return env.runIsolated(config, async () => {
        const backend = factoryInstance.createByType(type);
        await backend.initialize();
        try {
            return await fn(backend);
        }
        finally {
            await backend.shutdown();
        }
    });
}
//# sourceMappingURL=BackendFactory.js.map