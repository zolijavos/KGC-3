import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/index.ts',
        'src/*.module.ts',      // NestJS module wrapper
        'src/*.controller.ts',  // REST API controller (framework code)
      ],
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 70,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
