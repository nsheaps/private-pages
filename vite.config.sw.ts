import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/sw/sw.ts',
      formats: ['es'],
      fileName: () => 'sw.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'sw.js',
      },
    },
    sourcemap: true,
  },
});
