import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  plugins: [react()],
  server: {
    proxy: {
      // Auth service (Go/GIN) — http://localhost:8080
      // /auth-api/v1/auth/* → /v1/auth/*
      '/auth-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, ''),
      },
      // Canvas service (Go) — http://localhost:8082
      '/canvas': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Workspace / app service (Go/GIN) — http://localhost:3002
      // /ws/orgs  → /orgs
      // /ws/boards → /boards
      '/ws': {
        target: 'http://localhost:3002',
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
