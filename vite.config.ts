import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'isomorphic-git': ['isomorphic-git'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
