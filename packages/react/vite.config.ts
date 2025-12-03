import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts({
       rollupTypes: true,
       include: ['src/**/*'],
       // Ensure we're generating declarations for .tsx files
       entryRoot: 'src',
       tsconfigPath: resolve(__dirname, './tsconfig.app.json'),
       copyDtsFiles: true,
       insertTypesEntry: true,
     }),
    visualizer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ParaPortReact',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    sourcemap: false,
    // Enable watch only in development to avoid hanging CI builds
    watch: mode === 'development'
      ? {
          clearScreen: false,
          // Watch upstream core/static so React lib rebuilds during dev
          include: [
            'src/**/*',
            '../core/src/**/*',
            '../core/dist/**/*',
            '../static/src/**/*',
            '../static/dist/**/*',
          ],
        }
      : undefined,
    rollupOptions: {
      // Externalize React and polkadot-api (and its subpaths)
      // so the host app provides a single runtime copy.
      external: (id) => [
        'react',
        'react-dom',
        'polkadot-api'
      ].includes(id) || id.startsWith('polkadot-api/'),
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        sourcemap: false,
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css'
          return assetInfo.name as string
        },
      },
    },
  },
}))
