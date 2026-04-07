import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js', 'tests/**/*.prop.js'],
    globals: true,
    environment: 'jsdom',
  },
});
