import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/main/services/safety/**/*.test.ts'],
    env: {
      VITEST: 'true'
    }
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'electron/main'),
      '@shared': resolve(__dirname, 'shared')
    }
  }
})
