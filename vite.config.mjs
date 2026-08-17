import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    // Off Vite's default 5173, which every other Vite project on the machine
    // also wants. strictPort keeps the failure loud rather than letting the dev
    // server drift to another port that main.js isn't pointed at.
    port: 5199,
    strictPort: true,
  },
})
