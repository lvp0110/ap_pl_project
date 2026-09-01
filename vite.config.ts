import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ap_pl_project/',
  plugins: [react()],
  optimizeDeps: {
    include: ['exceljs'],
  },
  define: {
    global: 'globalThis',
  },
})
