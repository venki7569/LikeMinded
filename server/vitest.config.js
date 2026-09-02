import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // An in-memory MongoDB download/boot on a cold machine can be slow.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // A single MongoMemoryServer instance is shared across the suite.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/config/swagger.js'],
    },
  },
});
