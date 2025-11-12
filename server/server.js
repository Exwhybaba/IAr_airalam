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
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/malariaai'

// -----------------------
// CORS configuration
// -----------------------
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    const allowed = [
      'https://malariaai.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ]
    if (allowed.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) return callback(null, true)
    return callback(new Error(`CORS policy: origin '${origin}' not allowed`), false)
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  credentials: true
}))

// -----------------------
// Middleware
// -----------------------
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname)

app.use('/uploads', express.static(path.join(ROOT,'uploads')))
app.use('/assets', express.static(path.join(ROOT,'public')))

// -----------------------
// Routes
// -----------------------
app.use('/api/v1', inferRoutes)
app.use('/api/v1', resultsRoutes)
app.use('/api/v1', settingsRoutes)

// Landing page
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
  <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MalariaAI Node API</title></head>
    <body>
      <h1>MalariaAI Node API</h1>
      <p>Server running on <code>http://localhost:${PORT}</code></p>
      <ul>
        <li>Health: <a href="/health">/health</a></li>
        <li>Infer (POST): <code>/api/v1/infer</code></li>
        <li>Infer Batch (POST): <code>/api/v1/infer/batch</code></li>
        <li>Results: <a href="/api/v1/results">/api/v1/results</a></li>
      </ul>
    </body>
  </html>`)
})

// Health
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

// -----------------------
// MongoDB connect and start
// -----------------------
connectMongo(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
  })
  .catch(err => {
    console.warn('MongoDB connect failed:', err.message)
    app.listen(PORT, () => console.log(`Node API listening on http://localhost:${PORT}`))
  })

// -----------------------
// Fallback 404
// -----------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', method: req.method, path: req.path })
})
