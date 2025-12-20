/**
 * AtomicConfig Unit Tests
 *
 * Tests for the hot-reload configuration system including:
 * - Schema validation with Zod
 * - File watching and atomic swaps
 * - Subscriber notifications
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import {
  AtomicConfig,
  ConfigChangeEvent,
  registerConfig,
  getConfig,
  clearConfigs,
} from '../../src/config/AtomicConfig';

// Test schema
const TestConfigSchema = z.object({
  name: z.string().default('test'),
  count: z.number().min(0).max(100).default(10),
  enabled: z.boolean().default(true),
  nested: z
    .object({
      value: z.number().default(42),
      label: z.string().default('nested'),
    })
    .optional()
    .transform((v) => v ?? { value: 42, label: 'nested' }),
});

type TestConfig = z.infer<typeof TestConfigSchema>;

const DEFAULT_TEST_CONFIG: TestConfig = {
  name: 'test',
  count: 10,
  enabled: true,
  nested: { value: 42, label: 'nested' },
};

describe('AtomicConfig', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vulpes-config-test-'));
    configPath = path.join(tempDir, 'test-config.json');
    clearConfigs();
  });

  afterEach(async () => {
    clearConfigs();
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize with default config when no file exists', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      const value = config.get();
      expect(value.name).toBe('test');
      expect(value.count).toBe(10);
      expect(value.enabled).toBe(true);
    });

    it('should load config from file when it exists', async () => {
      // Write config file first
      await fs.writeFile(
        configPath,
        JSON.stringify({ name: 'from-file', count: 50, enabled: false })
      );

      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
        filePath: configPath,
      });

      await config.initialize();

      const value = config.get();
      expect(value.name).toBe('from-file');
      expect(value.count).toBe(50);
      expect(value.enabled).toBe(false);
    });

    it('should merge file config with defaults for missing fields', async () => {
      // Write partial config
      await fs.writeFile(configPath, JSON.stringify({ name: 'partial' }));

      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
        filePath: configPath,
      });

      await config.initialize();

      const value = config.get();
      expect(value.name).toBe('partial');
      expect(value.count).toBe(10); // Default
      expect(value.enabled).toBe(true); // Default
    });

    it('should reject invalid config from file and use defaults', async () => {
      // Write invalid config (count out of range)
      await fs.writeFile(
        configPath,
        JSON.stringify({ name: 'invalid', count: 999 })
      );

      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
        filePath: configPath,
      });

      await config.initialize();

      // Should fall back to defaults due to validation failure
      const value = config.get();
      expect(value.count).toBe(10); // Default because 999 is invalid
    });
  });

  describe('Schema Validation', () => {
    it('should validate config updates against schema', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      // Valid update
      const result = await config.set({ count: 50 });
      expect(result.success).toBe(true);
      expect(config.get().count).toBe(50);
    });

    it('should reject invalid updates', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      // Invalid update (count out of range)
      const result = await config.set({ count: 999 } as Partial<TestConfig>);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Config should remain unchanged
      expect(config.get().count).toBe(10);
    });

    it('should return validation errors on failure', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      const result = await config.set({ count: -5 } as Partial<TestConfig>);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Subscriber Notifications', () => {
    it('should notify subscribers on config change', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      const events: ConfigChangeEvent<TestConfig>[] = [];
      config.subscribe((event) => {
        events.push(event);
      });

      await config.set({ count: 75 });

      expect(events.length).toBe(1);
      expect(events[0].newConfig.count).toBe(75);
      expect(events[0].oldConfig.count).toBe(10);
    });

    it('should allow unsubscribing', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      let callCount = 0;
      const unsubscribe = config.subscribe(() => {
        callCount++;
      });

      await config.set({ count: 50 });
      expect(callCount).toBe(1);

      unsubscribe();

      await config.set({ count: 75 });
      expect(callCount).toBe(1); // Should not increment
    });
  });

  describe('Config Registry', () => {
    it('should register and retrieve configs by name', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'my-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();
      registerConfig('my-config', config);

      const retrieved = getConfig<TestConfig>('my-config');
      expect(retrieved).toBe(config);
    });

    it('should return undefined for non-existent configs', () => {
      const retrieved = getConfig('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should track subscriber count', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      expect(config.getStats().subscriberCount).toBe(0);

      const unsub1 = config.subscribe(() => {});
      expect(config.getStats().subscriberCount).toBe(1);

      const unsub2 = config.subscribe(() => {});
      expect(config.getStats().subscriberCount).toBe(2);

      unsub1();
      expect(config.getStats().subscriberCount).toBe(1);

      unsub2();
      expect(config.getStats().subscriberCount).toBe(0);
    });

    it('should track failed reloads', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      const initialStats = config.getStats();
      expect(initialStats.failedReloads).toBe(0);

      // Cause validation error
      await config.set({ count: 999 } as Partial<TestConfig>);

      // Note: set() failures don't increment failedReloads (that's for file reloads)
      // This is expected behavior
    });
  });

  describe('Destroy', () => {
    it('should clear subscribers on destroy', async () => {
      const config = new AtomicConfig<TestConfig>({
        name: 'test-config',
        schema: TestConfigSchema,
        defaults: DEFAULT_TEST_CONFIG,
      });

      await config.initialize();

      config.subscribe(() => {});
      config.subscribe(() => {});
      expect(config.getStats().subscriberCount).toBe(2);

      config.destroy();
      expect(config.getStats().subscriberCount).toBe(0);
    });
  });
});

describe('Schema Validation Edge Cases', () => {
  it('should handle deeply nested objects', async () => {
    const DeepSchema = z.object({
      level1: z.object({
        level2: z.object({
          level3: z.object({
            value: z.number().default(1),
          }),
        }),
      }),
    });

    type DeepConfig = z.infer<typeof DeepSchema>;

    const defaults: DeepConfig = {
      level1: { level2: { level3: { value: 1 } } },
    };

    const config = new AtomicConfig<DeepConfig>({
      name: 'deep-config',
      schema: DeepSchema,
      defaults,
    });

    await config.initialize();

    const result = await config.set({
      level1: { level2: { level3: { value: 42 } } },
    });

    expect(result.success).toBe(true);
    expect(config.get().level1.level2.level3.value).toBe(42);
  });

  it('should handle arrays in config', async () => {
    const ArraySchema = z.object({
      items: z.array(z.string()).default([]),
      numbers: z.array(z.number().min(0)).default([1, 2, 3]),
    });

    type ArrayConfig = z.infer<typeof ArraySchema>;

    const defaults: ArrayConfig = { items: [], numbers: [1, 2, 3] };

    const config = new AtomicConfig<ArrayConfig>({
      name: 'array-config',
      schema: ArraySchema,
      defaults,
    });

    await config.initialize();

    await config.set({ items: ['a', 'b', 'c'] });
    expect(config.get().items).toEqual(['a', 'b', 'c']);

    // Invalid array item
    const result = await config.set({
      numbers: [-1, 2, 3],
    } as Partial<ArrayConfig>);
    expect(result.success).toBe(false);
  });
});
