import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz' })
  ],
  build: {
    modulePreload: false, // Keep disabled so Vite doesn't preload lazy chunks in index.html
    cssCodeSplit: true,   // Split CSS per-route chunk — reduces render-blocking CSS size
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — shared across all pages (~140KB gzipped)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Lucide icons — bundle ALL icons into ONE chunk to prevent dozens of micro-files
          // Without this, Vite creates a separate ~0.8KB file for every icon used on a page
          'vendor-icons': ['lucide-react'],
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
