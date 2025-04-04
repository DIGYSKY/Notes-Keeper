import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    open: true,
  },
}); 