import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: { enabled: false },
    exclude: [
      'tests-e2e/**',
    ],
    include: [
      'src/**/*.{test,spec}.ts',
      'src/**/*.{test,spec}.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': '/Users/gaston/Projects/latamtcg/src',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxDev: true,
  },
})


