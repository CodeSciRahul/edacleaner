import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    },
    resolve: {
      alias: {
        '@main': resolve('electron/main'),
        '@shared': resolve('shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    },
    resolve: {
      alias: {
        '@preload': resolve('electron/preload'),
        '@shared': resolve('shared')
      }
    }
  },
  renderer: {
    root: resolve('renderer'),
    css: {
      postcss: resolve(__dirname, 'postcss.config.cjs')
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'renderer/index.html')
        }
      },
      sourcemap: true
    },
    resolve: {
      alias: {
        '@': resolve('renderer'),
        '@shared': resolve('shared')
      }
    },
    plugins: [react()]
  }
})
