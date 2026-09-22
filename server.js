import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT) || 3009
const UPSTREAM_URL = process.env.UPSTREAM_URL || 'http://localhost:3005'
const DIST_DIR = process.env.DIST_DIR || '/app/dist'
const INDEX_HTML = path.join(DIST_DIR, 'index.html')

const app = express()
app.set('trust proxy', 'loopback')

function health(_req, res) {
  res.json({
    status: 'ok',
    upstream: UPSTREAM_URL,
    dist: fs.existsSync(INDEX_HTML),
    uptime: Math.round(process.uptime()),
  })
}

app.get('/health', health)
app.get('/__front_health', health)

// Прокси в ConstrTodo монтируется в корень с pathFilter: app.use('/crm', ...)
// стрипает префикс и upstream получил бы /projects вместо /crm/projects.
app.use(
  createProxyMiddleware({
    target: UPSTREAM_URL,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 120_000,
    timeout: 120_000,
    pathFilter: (pathname) =>
      pathname === '/login' ||
      pathname === '/auth' ||
      pathname.startsWith('/auth/') ||
      pathname === '/crm' ||
      pathname.startsWith('/crm/') ||
      pathname.startsWith('/content/references/'),
    on: {
      proxyReq: (proxyReq) => {
        // ConstrTodo сверяет Origin со своим allowlist'ом и отвечает 403 на
        // чужой. Этот хоп server-to-server, CORS к нему неприменим; CSRF
        // держится на csrf_token + X-CSRF-Token.
        proxyReq.removeHeader('origin')
      },
      proxyRes: (proxyRes) => {
        delete proxyRes.headers['access-control-allow-origin']
        delete proxyRes.headers['access-control-allow-credentials']
        delete proxyRes.headers['access-control-allow-headers']
        delete proxyRes.headers['access-control-allow-methods']
      },
    },
  }),
)

app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }),
)

app.get('*', (_req, res, next) => {
  if (!fs.existsSync(INDEX_HTML)) return next(new Error(`${INDEX_HTML} not found`))
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(INDEX_HTML)
})

const server = app.listen(PORT, () => {
  console.log(`[frontend] listening on :${PORT}, dist=${DIST_DIR}, upstream=${UPSTREAM_URL}`)
})

function shutdown(signal) {
  console.log(`[frontend] ${signal} received, closing`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
