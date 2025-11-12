import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ParaPortCore',
      formats: ['es'],
      fileName: 'index',
    },
    sourcemap: mode !== 'production',
    // Only enable watch during development to avoid hanging CI builds
    watch: mode === 'development'
      ? {
          clearScreen: false,
          // Watch static so its changes rebuild core during dev
          include: [
            'src/**/*',
            '../static/src/**/*',
            '../static/dist/**/*',
          ],
        }
      : undefined,
    rollupOptions: {
      external: (id) => [
        '@paraport/static',
        'eventemitter3',
        'p-retry',
        'dedot',
        'polkadot-api',
      ].includes(id) || id.startsWith('polkadot-api/'),
    },
  },
  resolve: {
    alias: [{ find: '@', replacement: resolve(__dirname, 'src') }],
  },
  plugins: [
    dts({
      compilerOptions: { preserveWatchOutput: true },
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, './tsconfig.build.json'),
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'e2e/**',
      ],
      include: ['src'],
    }),
  ],
}))
