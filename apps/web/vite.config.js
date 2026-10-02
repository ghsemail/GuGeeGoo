import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        snake: path.resolve(__dirname, 'snake/index.html'),
        tank: path.resolve(__dirname, 'tank/index.html'),
        whack: path.resolve(__dirname, 'whack/index.html'),
        breakout: path.resolve(__dirname, 'breakout/index.html'),
        game2048: path.resolve(__dirname, '2048/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
