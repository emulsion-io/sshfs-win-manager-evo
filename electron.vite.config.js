import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import renderer from 'vite-plugin-electron-renderer'

const lessVariables = `
@main-color: #21252b;
@primary-color: #2486d8;
@success-color: #6ba368;
@danger-color: #e71d36;
`

export default defineConfig({
  main: {
    entry: 'src/main/index.js',
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('index.html')
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          additionalData: lessVariables
        }
      }
    },
    plugins: [
      renderer(),
      vue()
    ]
  }
})
