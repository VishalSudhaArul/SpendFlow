import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Pages are lazy-loaded (see App.jsx) and the charting library is its own
    // chunk, fetched only by pages with charts. The entry chunk (~155 kB gzip)
    // is React, the router, Zod, Axios and the app shell — all needed for the
    // first screen — so the warning threshold is set just above it.
    chunkSizeWarningLimit: 500,
  },
});
