// server/routes/infer.routes.js
import express from 'express'
import multer from 'multer'
import fs from 'fs'
import http from 'http'
import https from 'https'
import dns from 'dns'
import axios from 'axios'
import { getSettings } from '../store/config.js'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

const UPLOAD_DIR = 'uploads'

// Helper to choose upstream URL and asset base
function resolveUpstream() {
  const s = getSettings?.() || {}
  return {
    url: String(s.INFER_UPSTREAM_URL || process.env.INFER_UPSTREAM_URL || 'https://iar-airalam.onrender.com/api/v1/infer'),
    assetBase: String(s.INFER_ASSET_BASE || process.env.INFER_ASSET_BASE || 'https://iar-airalam.onrender.com/')
  }
}

// Make an IPv4-only agent (works with both http and https)
function makeIPv4Agent(url) {
  const lookup = (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback)
  return url && url.startsWith('https://')
    ? new https.Agent({ keepAlive: true, lookup })
    : new http.Agent({ keepAlive: true, lookup })
}

// Helper: compute headers (including content-length when possible)
function getFormHeadersWithLength(form) {
  return new Promise((resolve) => {
    try {
      const headers = form.getHeaders()
      form.getLength((err, length) => {
        if (!err && Number.isFinite(length)) headers['content-length'] = String(length)
        else {
          // couldn't determine length (falls back to chunked)
          // log a warning but still proceed
          console.warn('Could not compute FormData length; proceeding without content-length.', err && err.message)
        }
        resolve(headers)
      })
    } catch (e) {
      // form.getHeaders() may throw in odd environments, but we'll still fall back
      resolve(form.getHeaders ? form.getHeaders() : {})
    }
  })
}

// Centralized proxy function to upstream
async function proxyToUpstream({ form, params = {}, upstreamUrl, timeout = 180000 }) {
  const headers = await getFormHeadersWithLength(form)
  const agent = makeIPv4Agent(upstreamUrl)
  try {
    const r = await axios.post(upstreamUrl, form, {
      params,
      headers,
      httpAgent: agent,
      httpsAgent: agent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout
    })
    return { ok: true, data: r.data, headers: r.headers, status: r.status }
  } catch (err) {
    // Build a normalized error object to bubble up
    const upstream = err?.response || {}
    const body = upstream.data
    const status = upstream.status
    const hdrs = upstream.headers
    const msg = err?.message
    // rethrow with structured info
    const e = new Error('Upstream request failed')
    e.details = { status, headers: hdrs, body, message: msg, stack: err.stack }
    throw e
  }
}

// -----------------------
// Single inference
// -----------------------
router.post('/infer', upload.single('file'), async (req, res) => {
  // Keep a reference to file path for cleanup
  const filePath = req.file?.path
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' })

    const { url: INFER_UPSTREAM_URL, assetBase: INFER_ASSET_BASE } = resolveUpstream()

    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', fs.createReadStream(req.file.path), { filename: req.file.originalname })

    // preserve optional params (conf, iou)
    const settings = getSettings?.() || {}
    const params = {}
    if (req.query.conf) params.conf = Number(req.query.conf)
    else if (settings.CONF != null) params.conf = Number(settings.CONF)
    if (req.query.iou) params.iou = Number(req.query.iou)
    else if (settings.IOU != null) params.iou = Number(settings.IOU)

    // Proxy to upstream
    const result = await proxyToUpstream({ form, params, upstreamUrl: INFER_UPSTREAM_URL, timeout: 180000 })
    const py = result.data || {}

    // Normalize annotated image url if provided
    if (py && py.annotated_image_url) {
      const urlStr = String(py.annotated_image_url)
      if (!/^https?:\/\//i.test(urlStr)) py.annotated_image_url = `${INFER_ASSET_BASE}${urlStr}`
    }

    return res.json(py)
  } catch (err) {
    // Log structured error and return helpful info to client (but not sensitive internals)
    console.error('INFER PROXY ERROR:', err.message || err)
    const details = err?.details || {}
    if (details.status) {
      console.error('UPSTREAM STATUS:', details.status)
      try { console.error('UPSTREAM HEADERS:', JSON.stringify(details.headers || {}, null, 2)) } catch (_) {}
      try { console.error('UPSTREAM BODY (raw):', typeof details.body === 'string' ? details.body : JSON.stringify(details.body || {}, null, 2)) } catch (_) {}
    } else {
      console.error('UPSTREAM ERROR (no response):', err.stack || err)
    }
    return res.status(details.status || 502).json({
      error: 'Upstream inference server error',
      status: details.status || 502,
      headers: details.headers || undefined,
      body: details.body || (err && err.message)
    })
  } finally {
    // cleanup uploaded file
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch (x) { console.warn('cleanup failed', x && x.message) }
  }
})

// -----------------------
// Batch inference (multiple files) - optional, mirrors your previous behavior
// -----------------------
router.post('/infer/batch', upload.array('files'), async (req, res) => {
  const files = req.files || []
  const uploadedPaths = files.map(f => f.path)
  try {
    if (!files.length) return res.status(400).json({ error: 'files are required' })

    const { url: INFER_UPSTREAM_URL, assetBase: INFER_ASSET_BASE } = resolveUpstream()
    const settings = getSettings?.() || {}

    // whether to aggregate as a single sample
    const aggregateRequested = String(req.body.aggregateBatch || req.query.aggregateBatch || '').toLowerCase() === 'true'

    const items = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try {
        const FormData = (await import('form-data')).default
        const form = new FormData()
        form.append('file', fs.createReadStream(f.path), { filename: f.originalname })

        // preserve per-file params if present (use top-level conf/iou as fallback)
        const params = {}
        if (req.query.conf) params.conf = Number(req.query.conf)
        else if (settings.CONF != null) params.conf = Number(settings.CONF)
        if (req.query.iou) params.iou = Number(req.query.iou)
        else if (settings.IOU != null) params.iou = Number(settings.IOU)

        const result = await proxyToUpstream({ form, params, upstreamUrl: INFER_UPSTREAM_URL, timeout: 180000 })
        const py = result.data || {}
        if (py && py.annotated_image_url) {
          const urlStr = String(py.annotated_image_url)
          if (!/^https?:\/\//i.test(urlStr)) py.annotated_image_url = `${INFER_ASSET_BASE}${urlStr}`
        }
        items.push({ id: f.originalname, status: 'done', result: py })
      } catch (e) {
        console.error('BATCH ITEM ERROR for', f.originalname, e && e.message)
        items.push({ id: f.originalname, status: 'error', error: e?.details?.body || e.message || 'upstream error' })
      }
    }

    // Optionally aggregate results here as you had in your previous implementation.
    return res.json({ batch_id: Date.now().toString(), items })
  } catch (err) {
    console.error('INFER/BATCH ERROR:', err.stack || err)
    return res.status(500).json({ error: err.message || 'batch inference failed' })
  } finally {
    // cleanup all uploaded files
    for (const p of uploadedPaths) {
      try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch (x) { /* ignore */ }
    }
  }
})

export default router
