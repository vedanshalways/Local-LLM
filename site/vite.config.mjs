import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative so the build works both at a domain root and under a GitHub Pages
  // project path (/Local-LLM/) without a rebuild.
  base: './',
  // 5173 belongs to the app's own `npm run dev`; keeping the site off it lets
  // both run at once instead of one failing to bind.
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist' },
})
