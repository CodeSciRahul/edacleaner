import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // Expose SERVER_API_BASE_URL (default electron-vite prefix is MAIN_VITE_)
    envPrefix: 'SERVER_',
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
    // Keep VITE_ for flags; also expose SERVER_API_BASE_URL
    envPrefix: ['VITE_', 'SERVER_'],
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
