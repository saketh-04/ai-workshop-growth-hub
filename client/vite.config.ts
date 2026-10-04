import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In dev, /api is proxied to the Express server so there are no CORS headaches.
// In production set VITE_API_URL to the deployed API (e.g. the Render URL).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
});
