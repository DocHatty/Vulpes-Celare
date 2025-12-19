"use strict";
/**
 * ============================================================================
 * VULPES CELARE - SERVICE CONTAINER (Dependency Injection)
 * ============================================================================
 *
 * A lightweight dependency injection container that provides:
 * - Service registration and resolution
 * - Singleton and transient lifecycles
 * - Easy testing through service replacement
 * - Type-safe service retrieval
 *
 * Design follows recommendations from:
 * - https://inversify.io/ (InversifyJS patterns)
 * - https://leapcell.io/blog/dependency-injection-beyond-nestjs
 * - https://blog.logrocket.com/top-five-typescript-dependency-injection-containers/
 *
 * This is a minimal implementation that doesn't require decorators or
 * reflect-metadata, making it easier to adopt incrementally.
 *
 * @module core/ServiceContainer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.ServiceContainer = exports.ServiceIds = void 0;
exports.getService = getService;
exports.hasService = hasService;
exports.createMigratableGetter = createMigratableGetter;
/**
 * Service identifiers for type-safe resolution
 */
exports.ServiceIds = {
    // Core services
    ParallelRedactionEngine: Symbol.for("ParallelRedactionEngine"),
    FilterWorkerPool: Symbol.for("FilterWorkerPool"),
    NameDetectionCoordinator: Symbol.for("NameDetectionCoordinator"),
    PostFilterService: Symbol.for("PostFilterService"),
    // Utility services
    ComputationCache: Symbol.for("ComputationCache"),
    VulpesEnvironment: Symbol.for("VulpesEnvironment"),
    VulpesLogger: Symbol.for("VulpesLogger"),
    // Security services
    SecurityAlertEngine: Symbol.for("SecurityAlertEngine"),
    // Observability services
    VulpesTracer: Symbol.for("VulpesTracer"),
    PipelineTracer: Symbol.for("PipelineTracer"),
    // ML services
    FalsePositiveClassifier: Symbol.for("FalsePositiveClassifier"),
    EnhancedPHIDetector: Symbol.for("EnhancedPHIDetector"),
    // Plugin services
    PluginManager: Symbol.for("PluginManager"),
    // Compliance services
    RetentionPolicyEngine: Symbol.for("RetentionPolicyEngine"),
    // AI services
    VulpesAIDebugger: Symbol.for("VulpesAIDebugger"),
};
// ============================================================================
// SERVICE CONTAINER
// ============================================================================
/**
 * Lightweight dependency injection container
 *
 * @example
 * ```typescript
 * // Register a service
 * container.registerSingleton(ServiceIds.VulpesLogger, () => new VulpesLogger());
 *
 * // Resolve a service
 * const logger = container.resolve<VulpesLogger>(ServiceIds.VulpesLogger);
 *
 * // For testing, replace with a mock
 * container.replace(ServiceIds.VulpesLogger, () => mockLogger);
 * ```
 */
class ServiceContainer {
    static _instance = null;
    services = new Map();
    /**
     * Get the global container instance
     */
    static getInstance() {
        if (!ServiceContainer._instance) {
            ServiceContainer._instance = new ServiceContainer();
        }
        return ServiceContainer._instance;
    }
    /**
     * Reset the container (useful for testing)
     */
    static resetInstance() {
        ServiceContainer._instance = null;
    }
    /**
     * Register a singleton service
     * @param id Service identifier
     * @param factory Factory function to create the service
     */
    registerSingleton(id, factory) {
        this.services.set(id, {
            factory,
            lifecycle: "singleton",
        });
    }
    /**
     * Register a transient service (new instance each time)
     * @param id Service identifier
     * @param factory Factory function to create the service
     */
    registerTransient(id, factory) {
        this.services.set(id, {
            factory,
            lifecycle: "transient",
        });
    }
    /**
     * Register a pre-existing instance as a singleton
     * @param id Service identifier
     * @param instance The instance to register
     */
    registerInstance(id, instance) {
        this.services.set(id, {
            factory: () => instance,
            lifecycle: "singleton",
            instance,
        });
    }
    /**
     * Resolve a service by its identifier
     * @param id Service identifier
     * @returns The service instance
     * @throws Error if service is not registered
     */
    resolve(id) {
        const descriptor = this.services.get(id);
        if (!descriptor) {
            throw new Error(`Service not registered: ${id.toString()}`);
        }
        if (descriptor.lifecycle === "singleton") {
            if (descriptor.instance === undefined) {
                descriptor.instance = descriptor.factory();
            }
            return descriptor.instance;
        }
        return descriptor.factory();
    }
    /**
     * Try to resolve a service, returning undefined if not registered
     * @param id Service identifier
     * @returns The service instance or undefined
     */
    tryResolve(id) {
        try {
            return this.resolve(id);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Check if a service is registered
     * @param id Service identifier
     */
    isRegistered(id) {
        return this.services.has(id);
    }
    /**
     * Replace a service registration (useful for testing)
     * @param id Service identifier
     * @param factory New factory function
     */
    replace(id, factory) {
        const existing = this.services.get(id);
        const lifecycle = existing?.lifecycle ?? "singleton";
        this.services.set(id, {
            factory,
            lifecycle,
            instance: undefined, // Clear cached instance
        });
    }
    /**
     * Clear a specific service registration
     * @param id Service identifier
     */
    unregister(id) {
        this.services.delete(id);
    }
    /**
     * Clear all service registrations (useful for testing)
     */
    clear() {
        this.services.clear();
    }
    /**
     * Get all registered service IDs
     */
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }
}
exports.ServiceContainer = ServiceContainer;
// ============================================================================
// EXPORTS
// ============================================================================
/**
 * Global service container instance
 */
exports.container = ServiceContainer.getInstance();
/**
 * Helper function to get a service from the global container
 */
function getService(id) {
    return exports.container.resolve(id);
}
/**
 * Helper function to check if a service is available
 */
function hasService(id) {
    return exports.container.isRegistered(id);
}
// ============================================================================
// MIGRATION HELPER
// ============================================================================
/**
 * Helper to migrate existing singletons to use the container.
 *
 * This allows gradual migration: existing code continues to work
 * while new code can use dependency injection.
 *
 * @example
 * ```typescript
 * // In your singleton class:
 * class MySingleton {
 *   private static _instance: MySingleton;
 *
 *   static getInstance(): MySingleton {
 *     // Check container first
 *     const fromContainer = container.tryResolve<MySingleton>(ServiceIds.MySingleton);
 *     if (fromContainer) return fromContainer;
 *
 *     // Fall back to static instance
 *     if (!MySingleton._instance) {
 *       MySingleton._instance = new MySingleton();
 *       // Register in container for consistency
 *       container.registerInstance(ServiceIds.MySingleton, MySingleton._instance);
 *     }
 *     return MySingleton._instance;
 *   }
 * }
 * ```
 */
function createMigratableGetter(serviceId, fallbackFactory) {
    let fallbackInstance = null;
    return () => {
        // Try container first (enables DI/testing)
        const fromContainer = exports.container.tryResolve(serviceId);
        if (fromContainer !== undefined) {
            return fromContainer;
        }
        // Fall back to static instance
        if (fallbackInstance === null) {
            fallbackInstance = fallbackFactory();
            // Register for consistency
            exports.container.registerInstance(serviceId, fallbackInstance);
        }
        return fallbackInstance;
    };
}
//# sourceMappingURL=ServiceContainer.js.map