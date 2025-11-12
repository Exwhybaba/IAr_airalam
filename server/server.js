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

// ---------------- CORS SETUP ----------------
// Use a dynamic function to allow:
// 1. Main domain
// 2. Any Vercel preview deployment (*.vercel.app)
// 3. localhost for dev
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // allow server-to-server / curl

    const allowed = [
      'https://malariaai.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ]

    // Allow main domain OR localhost OR any Vercel preview subdomain
    if (allowed.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
      return callback(null, true)
    }

    const msg = `CORS policy: origin '${origin}' not allowed`
    return callback(new Error(msg), false)
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  credentials: true
}))

// ---------------- EXPRESS SETUP ----------------
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname)
app.use('/uploads', express.static(path.join(ROOT,'uploads')))
app.use('/assets', express.static(path.join(ROOT,'public')))

// ---------------- ROUTES ----------------
app.use('/api/v1', inferRoutes)
app.use('/api/v1', resultsRoutes)
app.use('/api/v1', settingsRoutes)

// ---------------- LANDING PAGE ----------------
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
  res.json({
    status: 'ok',
    upstream: s.INFER_UPSTREAM_URL || null,
    wbcs_per_ul_default: s.WBCS_PER_UL_DEFAULT,
    conf: s.CONF,
    iou: s.IOU
  })
})

// ---------------- CONNECT MONGO AND START SERVER ----------------
connectMongo(MONGO_URI).then(()=>{
  console.log('MongoDB connected')
  app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
}).catch(err=>{
  console.warn('MongoDB connect failed:', err.message)
  app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
})

// ---------------- FALLBACK 404 ----------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', method: req.method, path: req.path })
})
