import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

/** Parse a dotenv file into key/value pairs */
function parseDotEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

// vite-plugin-static-copy is used for production builds only
// Dev server (npm run demo) serves Cesium assets directly from node_modules
export default defineConfig(({ mode }) => {
  // Vite only auto-loads .env / .env.local — merge .env.example so keys there are picked up
  const fromExample = parseDotEnv(path.resolve(__dirname, '.env.example'))
  const fromVite = loadEnv(mode, process.cwd(), '')
  const merged = { ...fromExample, ...fromVite }

  const envDefines: Record<string, string> = {}
  for (const [key, val] of Object.entries(merged)) {
    if (key.startsWith('VITE_')) {
      envDefines[`import.meta.env.${key}`] = JSON.stringify(val)
    }
  }

  return {
    plugins: [react()],
    define: {
      CESIUM_BASE_URL: JSON.stringify('/'),
      ...envDefines,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['zustand', 'react', 'react-dom'],
    },
    server: {
      fs: { allow: ['..'] },
      // Proxy the Browserbase research endpoint to the local dev shim
      // (server/dev.ts). In production Vercel serves api/research.ts directly.
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})
