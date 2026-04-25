import type { IncomingMessage, ServerResponse } from 'node:http'

import react from '@vitejs/plugin-react-swc'
import { createReadStream, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'
import { defineConfig, type ViteDevServer } from 'vite'
import mkcert from 'vite-plugin-mkcert'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

const gamefilesRoot = resolve(__dirname, 'gamefiles')

const gamefilesDev = () => ({
  apply: 'serve' as const,
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/gamefiles', (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
      const rel = decodeURIComponent((req.url ?? '').split('?')[0])
      const full = normalize(join(gamefilesRoot, rel))

      if (!full.startsWith(gamefilesRoot)) {
        res.statusCode = 403

        return res.end()
      }

      try {
        const stat = statSync(full)

        if (!stat.isFile()) {
          return next()
        }

        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Length', stat.size)
        createReadStream(full).pipe(res)
      } catch {
        next()
      }
    })
  },
  name: 'gamefiles-dev',
})

export default defineConfig({
  plugins: [mkcert(), wasm(), topLevelAwait(), gamefilesDev(), react()],
  server: { fs: { allow: ['..'] }, https: true },
})
