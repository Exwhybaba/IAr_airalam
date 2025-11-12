import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectMongo } from './config/db.js'
import inferRoutes from './routes/infer.routes.js'
import resultsRoutes from './routes/results.routes.js'
import settingsRoutes from './routes/settings.routes.js'

const app = express()
const PORT = Number(process.env.PORT || 5000)
// Prefer explicit env; fallback to IPv4 localhost to avoid ::1 issues
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/malariaai'

// Allow common Vite dev ports by default; can be overridden via env
// CORS configuration - robust and safe
// Set ALLOW_ORIGIN in env as a comma-separated list, e.g.:
// ALLOW_ORIGIN=https://malaria-1kh3k4gdn-oyelayo-seye-daniels-projects.vercel.app,https://malariaai.onrender.com,http://localhost:5173
const rawAllow = process.env.ALLOW_ORIGIN || 'http://localhost:5173,http://localhost:3000'
const allowedOrigins = rawAllow.split(',').map(s => s.trim()).filter(Boolean)

// Use a function so we can:
// - allow requests from allowedOrigins,
// - allow server-to-server requests that have no origin (curl, Postman),
// - return a helpful error for disallowed browser origins.
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (no origin) e.g. curl, server-to-server
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true)
    }

    // For a disallowed origin, fail the CORS handshake and provide a clear message
    const msg = `CORS policy: origin '${origin}' not allowed by ALLOW_ORIGIN`
    return callback(new Error(msg), false)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true // set true only if you actually use cookies/credentials in browser requests
}))


app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname)
app.use('/uploads', express.static(path.join(ROOT,'uploads')))
app.use('/assets', express.static(path.join(ROOT,'public')))

app.use('/api/v1', inferRoutes)
app.use('/api/v1', resultsRoutes)
app.use('/api/v1', settingsRoutes)

// Friendly landing page
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>MalariaAI Node API</title>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:2rem;line-height:1.6;color:#111} code{background:#f3f4f6;padding:.2rem .4rem;border-radius:.25rem} a{color:#b91c1c;text-decoration:none} a:hover{text-decoration:underline}</style>
    </head>
    <body>
      <h1>MalariaAI Node API</h1>
      <p>Server is running on <code>http://localhost:${PORT}</code>.</p>
      <ul>
        <li>Health: <a href="/health">/health</a></li>
        <li>Infer (POST): <code>/api/v1/infer</code></li>
        <li>Infer Batch (POST): <code>/api/v1/infer/batch</code></li>
        <li>Results: <a href="/api/v1/results">/api/v1/results</a></li>
      </ul>
    </body>
  </html>`)
})

import { getSettings } from './store/config.js'
app.get('/health', (_req,res)=>{
  const s = getSettings()
  res.json({ status: 'ok', upstream: s.INFER_UPSTREAM_URL || null, wbcs_per_ul_default: s.WBCS_PER_UL_DEFAULT, conf: s.CONF, iou: s.IOU })
})

connectMongo(MONGO_URI).then(()=>{
  console.log('MongoDB connected')
  app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
}).catch(err=>{
  console.warn('MongoDB connect failed:', err.message)
  app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
})

// Fallback 404 JSON for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', method: req.method, path: req.path })
})
