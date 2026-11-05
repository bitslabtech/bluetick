import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression for all built assets
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    // Brotli compression — ~15-25% smaller than gzip for modern browsers
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  // Prevent Vite from eagerly pre-bundling heavy libraries that should only
  // load on-demand when their lazy page chunk is first navigated to.
  optimizeDeps: {
    include: ['use-sync-external-store/shim/with-selector.js'],
    exclude: ['@xyflow/react', 'framer-motion', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
  },
  // Drop console and debugger statements in production builds for smaller size and security
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: process.env.BUILD_OUT_DIR || 'dist',
    emptyOutDir: true,
    modulePreload: false, // Keep disabled so Vite doesn't preload lazy chunks in index.html
    cssCodeSplit: true,   // Split CSS per-route chunk — reduces render-blocking CSS size
    chunkSizeWarningLimit: 600, // Suppress noise for known large vendor chunks
    minify: 'esbuild',    // Native esbuild minifier — fast, reliable, and memory-safe
    rollupOptions: {
      // NOTE: Do NOT set treeshake.moduleSideEffects: false — it strips CSS imports
      // which are side-effect-only (import './index.css') and breaks all styling.
      output: {
        // Let Rollup automatically split chunks based on dynamic import boundaries.
        // This ensures lazy pages (Dashboard, FlowBot, etc.) keep their heavy dependencies
        // (recharts, @xyflow, etc.) completely isolated to their own chunks, without leaking
        // into the critical entry bundle loaded on the landing page.
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
