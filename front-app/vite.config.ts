import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Canvas service (Go) — http://localhost:8082
      '/canvas': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Workspace / app service (Go/GIN) — http://localhost:8080
      // /ws/orgs  → /orgs
      // /ws/boards → /boards
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
      // AI generate proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
