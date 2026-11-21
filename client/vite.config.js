import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// Lucide icon files the app imports by name (e.g. `import { Send, Users } from 'lucide-react'`).
// Without grouping, Rollup emits one ~1 KB file per icon (~200 files), so every page needed 15–80
// requests and menu clicks felt slow. These icons go into ONE shared, long-cached "icons" file
// (~23 KB gzip). The full icon set — pulled in only by the store menu icon picker via
// `import * as Icons` — is deliberately NOT included, so it stays in its own file for those pages.
function appIconFiles() {
  try {
    const barrel = fs.readFileSync(path.join(root, 'node_modules/lucide-react/dist/esm/lucide-react.js'), 'utf8')
    const fileByName = new Map()
    for (const m of barrel.matchAll(/export \{([^}]+)\} from '\.\/icons\/([^']+)'/g))
      for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[1]; if (n) fileByName.set(n, m[2]) }
    const used = new Set()
    const walk = (dir) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f)
        if (fs.statSync(p).isDirectory()) walk(p)
        else if (/\.(jsx?|tsx?)$/.test(f))
          for (const m of fs.readFileSync(p, 'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g))
            for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0]; if (fileByName.has(n)) used.add(fileByName.get(n)) }
      }
    }
    walk(path.join(root, 'src'))
    return used
  } catch (e) {
    console.warn('[vite] icon grouping skipped:', e.message) // build still works, just with per-icon files
    return new Set()
  }
}
const APP_ICONS = appIconFiles()

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
        // Rollup splits chunks at dynamic-import boundaries, so lazy pages keep their heavy
        // dependencies (recharts, @xyflow, etc.) out of the landing page bundle.
        // The one exception is icons: group the app's named icons into one shared file (see above).
        manualChunks(id) {
          const icon = id.match(/lucide-react\/dist\/esm\/icons\/([^/]+\.js)$/)
          if (icon && APP_ICONS.has(icon[1])) return 'icons'
          if (/lucide-react\/dist\/esm\/(Icon|createLucideIcon|defaultAttributes|shared\/|context)/.test(id)) return 'icons'
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
