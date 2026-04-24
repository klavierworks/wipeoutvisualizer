import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import mkcert from 'vite-plugin-mkcert'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { createReadStream, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

const gamefilesRoot = resolve(__dirname, 'gamefiles')

const gamefilesDev = () => ({
  name: 'gamefiles-dev',
  apply: 'serve' as const,
  configureServer(server: any) {
    server.middlewares.use('/gamefiles', (req: any, res: any, next: any) => {
      const rel = decodeURIComponent((req.url ?? '').split('?')[0])
      const full = normalize(join(gamefilesRoot, rel))
      if (!full.startsWith(gamefilesRoot)) {
        res.statusCode = 403
        return res.end()
      }
      try {
        const stat = statSync(full)
        if (!stat.isFile()) return next()
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Length', stat.size)
        createReadStream(full).pipe(res)
      } catch {
        next()
      }
    })
  },
})

export default defineConfig({
  server: { https: true, fs: { allow: ['..'] } },
  plugins: [mkcert(), wasm(), topLevelAwait(), gamefilesDev(), react()],
})
