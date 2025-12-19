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
/**
 * Service lifecycle types
 */
export type ServiceLifecycle = "singleton" | "transient";
/**
 * Service registration descriptor
 */
export interface ServiceDescriptor<T> {
    /** Factory function to create the service */
    factory: () => T;
    /** Lifecycle type */
    lifecycle: ServiceLifecycle;
    /** Cached instance for singletons */
    instance?: T;
}
/**
 * Service identifiers for type-safe resolution
 */
export declare const ServiceIds: {
    readonly ParallelRedactionEngine: symbol;
    readonly FilterWorkerPool: symbol;
    readonly NameDetectionCoordinator: symbol;
    readonly PostFilterService: symbol;
    readonly ComputationCache: symbol;
    readonly VulpesEnvironment: symbol;
    readonly VulpesLogger: symbol;
    readonly SecurityAlertEngine: symbol;
    readonly VulpesTracer: symbol;
    readonly PipelineTracer: symbol;
    readonly FalsePositiveClassifier: symbol;
    readonly EnhancedPHIDetector: symbol;
    readonly PluginManager: symbol;
    readonly RetentionPolicyEngine: symbol;
    readonly VulpesAIDebugger: symbol;
};
export type ServiceId = (typeof ServiceIds)[keyof typeof ServiceIds];
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
export declare class ServiceContainer {
    private static _instance;
    private services;
    /**
     * Get the global container instance
     */
    static getInstance(): ServiceContainer;
    /**
     * Reset the container (useful for testing)
     */
    static resetInstance(): void;
    /**
     * Register a singleton service
     * @param id Service identifier
     * @param factory Factory function to create the service
     */
    registerSingleton<T>(id: symbol, factory: () => T): void;
    /**
     * Register a transient service (new instance each time)
     * @param id Service identifier
     * @param factory Factory function to create the service
     */
    registerTransient<T>(id: symbol, factory: () => T): void;
    /**
     * Register a pre-existing instance as a singleton
     * @param id Service identifier
     * @param instance The instance to register
     */
    registerInstance<T>(id: symbol, instance: T): void;
    /**
     * Resolve a service by its identifier
     * @param id Service identifier
     * @returns The service instance
     * @throws Error if service is not registered
     */
    resolve<T>(id: symbol): T;
    /**
     * Try to resolve a service, returning undefined if not registered
     * @param id Service identifier
     * @returns The service instance or undefined
     */
    tryResolve<T>(id: symbol): T | undefined;
    /**
     * Check if a service is registered
     * @param id Service identifier
     */
    isRegistered(id: symbol): boolean;
    /**
     * Replace a service registration (useful for testing)
     * @param id Service identifier
     * @param factory New factory function
     */
    replace<T>(id: symbol, factory: () => T): void;
    /**
     * Clear a specific service registration
     * @param id Service identifier
     */
    unregister(id: symbol): void;
    /**
     * Clear all service registrations (useful for testing)
     */
    clear(): void;
    /**
     * Get all registered service IDs
     */
    getRegisteredServices(): symbol[];
}
/**
 * Global service container instance
 */
export declare const container: ServiceContainer;
/**
 * Helper function to get a service from the global container
 */
export declare function getService<T>(id: symbol): T;
/**
 * Helper function to check if a service is available
 */
export declare function hasService(id: symbol): boolean;
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
export declare function createMigratableGetter<T>(serviceId: symbol, fallbackFactory: () => T): () => T;
//# sourceMappingURL=ServiceContainer.d.ts.map