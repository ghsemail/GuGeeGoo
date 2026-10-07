import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 便于核对线上是否已发布最新构建（查看网页源代码中的 build 注释） */
function injectBuildMeta() {
  const sha =
    process.env.GITHUB_SHA?.slice(0, 7) ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    'local';
  return {
    name: 'inject-build-meta',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <!-- build ${sha} -->\n</head>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [injectBuildMeta()],
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
        plant: path.resolve(__dirname, 'plant/index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
