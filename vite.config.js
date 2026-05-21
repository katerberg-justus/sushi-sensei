import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    cssMinify: false,
    minify: false,
  },
  optimizeDeps: {
    exclude: ['phaser'],
  },
  resolve: {
    preserveSymlinks: true,
  },
});
