import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// ── Custom Plugin: Convert render-blocking CSS to non-blocking preloads ────────
// At build time, transforms every Vite-injected <link rel="stylesheet"> into:
//   1. <link rel="preload" as="style"> — browser fetches CSS ASAP, no blocking
//   2. onload swap — once downloaded, swaps to rel="stylesheet" (applies styles)
//   3. <noscript> fallback — restores blocking for no-JS environments
// This eliminates the ~940ms render-blocking CSS delay on LCP/FCP.
function cssNonBlocking() {
  return {
    name: 'css-non-blocking',
    apply: 'build',
    transformIndexHtml(html) {
      // Match all Vite-injected stylesheet links (excluding fonts, already handled)
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
        (_, href) =>
          `<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
      )
    }
  }
}
// ──────────────────────────────────────────────────────────────────────────────

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cssNonBlocking(),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }), // Brotli for better compression
  ],
  // Prevent Vite from eagerly pre-bundling heavy libraries that should only
  // load on-demand when their lazy page chunk is first navigated to.
  optimizeDeps: {
    exclude: ['recharts', '@xyflow/react', 'framer-motion', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
  },
  build: {
    modulePreload: false, // Keep disabled so Vite doesn't preload lazy chunks in index.html
    cssCodeSplit: true,   // Split CSS per-route chunk — reduces render-blocking CSS size
    chunkSizeWarningLimit: 600, // Suppress noise for known large vendor chunks
    rollupOptions: {
      treeshake: {
        // Aggressive dead-code elimination — removes unused exports from every module
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        manualChunks: {
          // Core React — shared across all pages (~140KB gzipped)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Lucide icons — bundle ALL icons into ONE chunk to prevent dozens of micro-files
          // Without this, Vite creates a separate ~0.8KB file for every icon used on a page
          'vendor-icons': ['lucide-react'],
          // Charts — only loaded on Dashboard, Reports, Campaign pages (~300KB)
          // Not imported anywhere in the critical path → deferred until first chart page visit
          'vendor-charts': ['recharts'],
          // Flow builder — only loaded on FlowBot page (~200KB)
          'vendor-flow': ['@xyflow/react'],
          // Animation library — no longer in critical path (UIContext + Layout migrated to CSS)
          // Only loads when a lazy page that imports framer-motion is first navigated to
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
