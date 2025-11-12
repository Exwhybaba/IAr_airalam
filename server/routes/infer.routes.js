import express from 'express'
import multer from 'multer'
import fs from 'fs'
import axios from 'axios'
import { getSettings } from '../store/config.js'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// Helper to choose upstream URL
function resolveUpstream() {
  const s = getSettings()
  return {
    url: s.INFER_UPSTREAM_URL || 'https://iar-airalam.onrender.com/api/v1/infer',
    assetBase: s.INFER_ASSET_BASE || 'https://iar-airalam.onrender.com/'
  }
}

// Optional: fix IPv4 axios issue
function makeIPv4Agent(_url) {
  return undefined // or use `http.Agent` / `https.Agent` if needed
}

// -----------------------
// Single inference
// -----------------------
router.post('/infer', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' })

    const { url: INFER_UPSTREAM_URL, assetBase: INFER_ASSET_BASE } = resolveUpstream()

    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', fs.createReadStream(req.file.path), { filename: req.file.originalname })

    // Optional query params
    const settings = getSettings?.() || {}
    const params = {}
    if (req.query.conf) params.conf = Number(req.query.conf)
    else if (settings.CONF != null) params.conf = Number(settings.CONF)
    if (req.query.iou) params.iou = Number(req.query.iou)
    else if (settings.IOU != null) params.iou = Number(settings.IOU)

    const headers = form.getHeaders()
    await new Promise((resolve) => {
      form.getLength((err, length) => {
        if (!err && Number.isFinite(length)) headers['content-length'] = String(length)
        resolve()
      })
    })

    const agent = makeIPv4Agent(INFER_UPSTREAM_URL)

    const r = await axios.post(INFER_UPSTREAM_URL, form, {
      params,
      headers,
      httpAgent: agent,
      httpsAgent: agent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000
    })

    const py = r.data

    if (py && py.annotated_image_url) {
      const url = String(py.annotated_image_url)
      if (!/^https?:\/\//i.test(url)) py.annotated_image_url = `${INFER_ASSET_BASE}${url}`
    }

    res.json(py)

  } catch (err) {
    console.error('INFER PROXY ERROR:', err.stack || err)
    if (err.response) {
      console.error('UPSTREAM STATUS:', err.response.status)
      console.error('UPSTREAM BODY:', JSON.stringify(err.response.data, null, 2))
    }
    res.status(err?.response?.status || 500).json({ error: err?.response?.data || err.message || 'unknown error' })
  } finally {
    try { if (req.file && req.file.path) fs.unlinkSync(req.file.path) } catch (_) {}
  }
})

export default router
