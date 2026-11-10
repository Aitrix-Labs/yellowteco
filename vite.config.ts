import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/yellowteco/',
  plugins: [react()],
  publicDir: 'public',
  server: { port: 5191, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    assetsInlineLimit: 0,
  },
})
