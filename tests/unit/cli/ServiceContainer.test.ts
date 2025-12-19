/**
 * Unit Tests for ServiceContainer (Dependency Injection)
 *
 * Tests the DI container functionality for testability and service management.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ServiceContainer,
  container,
  ServiceIds,
  getService,
  hasService,
  createMigratableGetter,
} from "../../../src/core/ServiceContainer";

describe("ServiceContainer", () => {
  let testContainer: ServiceContainer;

  beforeEach(() => {
    // Create a fresh container for each test
    testContainer = new ServiceContainer();
  });

  afterEach(() => {
    // Reset the global container after each test
    ServiceContainer.resetInstance();
  });

  describe("Singleton Registration", () => {
    it("should register and resolve a singleton service", () => {
      let instanceCount = 0;

      testContainer.registerSingleton(ServiceIds.VulpesLogger, () => {
        instanceCount++;
        return { log: () => {} };
      });

      const instance1 = testContainer.resolve(ServiceIds.VulpesLogger);
      const instance2 = testContainer.resolve(ServiceIds.VulpesLogger);

      expect(instance1).toBe(instance2); // Same instance
      expect(instanceCount).toBe(1); // Factory called only once
    });

    it("should create singleton on first resolve", () => {
      let created = false;

      testContainer.registerSingleton(ServiceIds.ComputationCache, () => {
        created = true;
        return {};
      });

      expect(created).toBe(false);

      testContainer.resolve(ServiceIds.ComputationCache);

      expect(created).toBe(true);
    });
  });

  describe("Transient Registration", () => {
    it("should create new instance for each resolve", () => {
      let instanceCount = 0;

      testContainer.registerTransient(Symbol.for("TransientTest"), () => {
        instanceCount++;
        return { id: instanceCount };
      });

      const instance1 = testContainer.resolve(Symbol.for("TransientTest"));
      const instance2 = testContainer.resolve(Symbol.for("TransientTest"));

      expect(instance1).not.toBe(instance2);
      expect(instanceCount).toBe(2);
    });
  });

  describe("Instance Registration", () => {
    it("should register a pre-existing instance", () => {
      const existingInstance = { data: "test" };

      testContainer.registerInstance(ServiceIds.VulpesTracer, existingInstance);

      const resolved = testContainer.resolve(ServiceIds.VulpesTracer);

      expect(resolved).toBe(existingInstance);
    });
  });

  describe("Service Resolution", () => {
    it("should throw when resolving unregistered service", () => {
      expect(() => {
        testContainer.resolve(Symbol.for("NonExistent"));
      }).toThrow("Service not registered");
    });

    it("should return undefined from tryResolve for unregistered service", () => {
      const result = testContainer.tryResolve(Symbol.for("NonExistent"));
      expect(result).toBeUndefined();
    });

    it("should return instance from tryResolve for registered service", () => {
      const instance = { test: true };
      testContainer.registerInstance(Symbol.for("TryResolveTest"), instance);

      const result = testContainer.tryResolve(Symbol.for("TryResolveTest"));

      expect(result).toBe(instance);
    });
  });

  describe("Service Replacement", () => {
    it("should replace a registered service", () => {
      const original = { version: 1 };
      const replacement = { version: 2 };

      testContainer.registerInstance(Symbol.for("ReplaceTest"), original);

      expect(testContainer.resolve(Symbol.for("ReplaceTest"))).toBe(original);

      testContainer.replace(Symbol.for("ReplaceTest"), () => replacement);

      expect(testContainer.resolve(Symbol.for("ReplaceTest"))).toBe(replacement);
    });

    it("should clear cached singleton instance on replace", () => {
      let callCount = 0;

      testContainer.registerSingleton(Symbol.for("CacheTest"), () => {
        callCount++;
        return { count: callCount };
      });

      // First resolution creates instance
      const first = testContainer.resolve<{ count: number }>(Symbol.for("CacheTest"));
      expect(first.count).toBe(1);

      // Replace clears cache
      testContainer.replace(Symbol.for("CacheTest"), () => {
        callCount++;
        return { count: callCount };
      });

      // Second resolution creates new instance
      const second = testContainer.resolve<{ count: number }>(Symbol.for("CacheTest"));
      expect(second.count).toBe(2);
    });
  });

  describe("Service Management", () => {
    it("should check if service is registered", () => {
      expect(testContainer.isRegistered(Symbol.for("CheckTest"))).toBe(false);

      testContainer.registerInstance(Symbol.for("CheckTest"), {});

      expect(testContainer.isRegistered(Symbol.for("CheckTest"))).toBe(true);
    });

    it("should unregister a service", () => {
      testContainer.registerInstance(Symbol.for("UnregisterTest"), {});

      expect(testContainer.isRegistered(Symbol.for("UnregisterTest"))).toBe(true);

      testContainer.unregister(Symbol.for("UnregisterTest"));

      expect(testContainer.isRegistered(Symbol.for("UnregisterTest"))).toBe(false);
    });

    it("should clear all services", () => {
      testContainer.registerInstance(Symbol.for("Clear1"), {});
      testContainer.registerInstance(Symbol.for("Clear2"), {});

      expect(testContainer.getRegisteredServices().length).toBe(2);

      testContainer.clear();

      expect(testContainer.getRegisteredServices().length).toBe(0);
    });

    it("should list registered services", () => {
      const sym1 = Symbol.for("List1");
      const sym2 = Symbol.for("List2");

      testContainer.registerInstance(sym1, {});
      testContainer.registerInstance(sym2, {});

      const services = testContainer.getRegisteredServices();

      expect(services).toContain(sym1);
      expect(services).toContain(sym2);
    });
  });

  describe("Global Container", () => {
    it("should provide singleton global instance", () => {
      const instance1 = ServiceContainer.getInstance();
      const instance2 = ServiceContainer.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should reset global instance", () => {
      const before = ServiceContainer.getInstance();
      ServiceContainer.resetInstance();
      const after = ServiceContainer.getInstance();

      expect(before).not.toBe(after);
    });
  });

  describe("Helper Functions", () => {
    it("should provide getService helper", () => {
      container.registerInstance(Symbol.for("HelperTest"), { helper: true });

      const service = getService<{ helper: boolean }>(Symbol.for("HelperTest"));

      expect(service.helper).toBe(true);
    });

    it("should provide hasService helper", () => {
      expect(hasService(Symbol.for("HasTest"))).toBe(false);

      container.registerInstance(Symbol.for("HasTest"), {});

      expect(hasService(Symbol.for("HasTest"))).toBe(true);
    });
  });

  describe("Migration Helper", () => {
    it("should create migratable getter that checks container first", () => {
      const serviceId = Symbol.for("MigratableTest");
      let fallbackCalled = false;

      const getter = createMigratableGetter(serviceId, () => {
        fallbackCalled = true;
        return { source: "fallback" };
      });

      // First call uses fallback
      const result1 = getter();
      expect(result1.source).toBe("fallback");
      expect(fallbackCalled).toBe(true);

      // Reset and register in container
      container.replace(serviceId, () => ({ source: "container" }));

      // Now should use container
      const result2 = getter();
      expect(result2.source).toBe("container");
    });
  });
});

describe("ServiceIds", () => {
  it("should have unique symbol values", () => {
    const ids = Object.values(ServiceIds);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should include expected core services", () => {
    expect(ServiceIds.NameDetectionCoordinator).toBeDefined();
    expect(ServiceIds.SecurityAlertEngine).toBeDefined();
    expect(ServiceIds.VulpesLogger).toBeDefined();
    expect(ServiceIds.ComputationCache).toBeDefined();
  });
});
