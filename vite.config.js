import { defineConfig } from 'vite';

// サンドボックス/Vercel どちらでも動くように host を開放。
// プレビューは https://{port}-{sandboxId}.e2b.app 経由でプロキシされるため allowedHosts を許可。
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
});
