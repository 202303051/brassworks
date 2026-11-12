import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { localOcrAssets } from './scripts/ocr-assets.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), localOcrAssets()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    watch: { ignored: ['**/.tools/**'] },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.tools/**'] },
  },
});
