import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT || 5173),
    // Client-side routes such as /user/farmer/home must fall back to index.html.
    strictPort: false,
  },
  preview: {
    port: Number(process.env.PORT || 4173),
  },
})
