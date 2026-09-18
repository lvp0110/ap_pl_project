import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstreamTarget =
    env.UPSTREAM_TARGET ||
    process.env.UPSTREAM_TARGET ||
    'http://localhost:3005'
  const basePath = env.BASE_PATH || process.env.BASE_PATH || '/ap_pl_project/'

  return {
    base: basePath,
    plugins: [react()],
    optimizeDeps: {
      include: ['exceljs'],
    },
    define: {
      global: 'globalThis',
    },
    server: {
      proxy: {
        '/login': { target: upstreamTarget, changeOrigin: true, secure: false },
        '/auth': { target: upstreamTarget, changeOrigin: true, secure: false },
        '/crm': { target: upstreamTarget, changeOrigin: true, secure: false },
        '/content': { target: upstreamTarget, changeOrigin: true, secure: false },
      },
    },
  }
})
