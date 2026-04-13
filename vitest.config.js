import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Allow tests to import proxy-side dependencies (installed in proxy/node_modules)
      'better-sqlite3': path.resolve(__dirname, 'proxy/node_modules/better-sqlite3'),
      'jsonwebtoken': path.resolve(__dirname, 'proxy/node_modules/jsonwebtoken'),
      'bcryptjs': path.resolve(__dirname, 'proxy/node_modules/bcryptjs'),
    },
  },
  test: {
    include: ['tests/**/*.test.js', 'tests/**/*.prop.js'],
    globals: true,
    environment: 'jsdom',
  },
});
