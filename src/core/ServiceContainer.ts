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

// ============================================================================
// TYPES
// ============================================================================

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
export const ServiceIds = {
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
} as const;

export type ServiceId = (typeof ServiceIds)[keyof typeof ServiceIds];

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
export class ServiceContainer {
  private static _instance: ServiceContainer | null = null;
  private services = new Map<symbol, ServiceDescriptor<unknown>>();

  /**
   * Get the global container instance
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer._instance) {
      ServiceContainer._instance = new ServiceContainer();
    }
    return ServiceContainer._instance;
  }

  /**
   * Reset the container (useful for testing)
   */
  static resetInstance(): void {
    ServiceContainer._instance = null;
  }

  /**
   * Register a singleton service
   * @param id Service identifier
   * @param factory Factory function to create the service
   */
  registerSingleton<T>(id: symbol, factory: () => T): void {
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
  registerTransient<T>(id: symbol, factory: () => T): void {
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
  registerInstance<T>(id: symbol, instance: T): void {
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
  resolve<T>(id: symbol): T {
    const descriptor = this.services.get(id);
    if (!descriptor) {
      throw new Error(`Service not registered: ${id.toString()}`);
    }

    if (descriptor.lifecycle === "singleton") {
      if (descriptor.instance === undefined) {
        descriptor.instance = descriptor.factory();
      }
      return descriptor.instance as T;
    }

    return descriptor.factory() as T;
  }

  /**
   * Try to resolve a service, returning undefined if not registered
   * @param id Service identifier
   * @returns The service instance or undefined
   */
  tryResolve<T>(id: symbol): T | undefined {
    try {
      return this.resolve<T>(id);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a service is registered
   * @param id Service identifier
   */
  isRegistered(id: symbol): boolean {
    return this.services.has(id);
  }

  /**
   * Replace a service registration (useful for testing)
   * @param id Service identifier
   * @param factory New factory function
   */
  replace<T>(id: symbol, factory: () => T): void {
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
  unregister(id: symbol): void {
    this.services.delete(id);
  }

  /**
   * Clear all service registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service IDs
   */
  getRegisteredServices(): symbol[] {
    return Array.from(this.services.keys());
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Global service container instance
 */
export const container = ServiceContainer.getInstance();

/**
 * Helper function to get a service from the global container
 */
export function getService<T>(id: symbol): T {
  return container.resolve<T>(id);
}

/**
 * Helper function to check if a service is available
 */
export function hasService(id: symbol): boolean {
  return container.isRegistered(id);
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
export function createMigratableGetter<T>(
  serviceId: symbol,
  fallbackFactory: () => T,
): () => T {
  let fallbackInstance: T | null = null;

  return () => {
    // Try container first (enables DI/testing)
    const fromContainer = container.tryResolve<T>(serviceId);
    if (fromContainer !== undefined) {
      return fromContainer;
    }

    // Fall back to static instance
    if (fallbackInstance === null) {
      fallbackInstance = fallbackFactory();
      // Register for consistency
      container.registerInstance(serviceId, fallbackInstance);
    }
    return fallbackInstance;
  };
}
