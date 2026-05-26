import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz' })
  ],
  optimizeDeps: {
    force: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — shared across all pages (~140KB gzipped)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts — only loaded on Dashboard, Reports, Campaign pages (~300KB)
          'vendor-charts': ['recharts'],
          // Flow builder — only loaded on FlowBot page (~200KB)
          'vendor-flow': ['@xyflow/react'],
          // Animation library — used across many pages (~100KB)
          'vendor-motion': ['framer-motion'],
          // Drag & drop — used on FlowBot, SystemControls (~50KB)
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        }
      }
    }
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
