import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ParaportSDK',
      fileName: 'index',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Avoid bundling polkadot-api to prevent duplicate copies in hosts.
      // Keep Vue external too.
      external: (id) => [
        'vue',
        'polkadot-api'
      ].includes(id) || id.startsWith('polkadot-api/'),
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css'
          return assetInfo.name as string
        }
      }
    },
  },
  server: {
    fs: {
      // Allow serving files from workspace packages for HMR
      allow: [
        '..',
      ],
    },
    watch: {
      // Follow symlinks so linked workspace deps trigger HMR
      followSymlinks: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    dts({ rollupTypes: true })
  ]
})
