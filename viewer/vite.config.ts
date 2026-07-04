import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
});
