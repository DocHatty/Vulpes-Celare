import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}', 'tests/benchmarks/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/cortex/node_modules/**'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
    },
    benchmark: {
      include: ['tests/benchmarks/**/*.bench.{js,ts}'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
