import express from 'express'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { getSettings, updateSettings } from '../store/config.js'

const router = express.Router()

router.get('/settings', (_req, res) => {
  const s = getSettings()
  res.json({ settings: s })
})

router.post('/settings', (req, res) => {
  try{
    const allowed = {}
    const body = req.body || {}
    // Backend/IT managed
    if (body.INFER_UPSTREAM_URL != null) allowed.INFER_UPSTREAM_URL = String(body.INFER_UPSTREAM_URL)
    if (body.INFER_ASSET_BASE != null) allowed.INFER_ASSET_BASE = String(body.INFER_ASSET_BASE)
    if (body.CONF != null) allowed.CONF = Number(body.CONF)
    if (body.IOU != null) allowed.IOU = Number(body.IOU)
    if (body.WBCS_PER_UL_DEFAULT != null) allowed.WBCS_PER_UL_DEFAULT = Number(body.WBCS_PER_UL_DEFAULT)
    if (body.WRITE_MEM_ALWAYS != null) allowed.WRITE_MEM_ALWAYS = Boolean(body.WRITE_MEM_ALWAYS)
    // Organization profile (hospital)
    if (body.ORG_NAME != null) allowed.ORG_NAME = String(body.ORG_NAME)
    if (body.ORG_EMAIL != null) allowed.ORG_EMAIL = String(body.ORG_EMAIL)
    if (body.ORG_PHONE != null) allowed.ORG_PHONE = String(body.ORG_PHONE)
    if (body.ORG_ADDRESS != null) allowed.ORG_ADDRESS = String(body.ORG_ADDRESS)
    if (body.LOGO_URL != null) allowed.LOGO_URL = String(body.LOGO_URL)
    // Notifications
    if (body.NOTIFY_EMAILS_ENABLED != null) allowed.NOTIFY_EMAILS_ENABLED = Boolean(body.NOTIFY_EMAILS_ENABLED)
    if (body.LOW_CONF_ALERTS_ENABLED != null) allowed.LOW_CONF_ALERTS_ENABLED = Boolean(body.LOW_CONF_ALERTS_ENABLED)
    const s = updateSettings(allowed)
    res.json({ settings: s })
  }catch(e){
    res.status(400).json({ error: e.message })
  }
})

// Logo upload
const ROOT = path.resolve(process.cwd(), 'server')
const PUBLIC_DIR = path.join(ROOT, 'public')
const BRAND_DIR = path.join(PUBLIC_DIR, 'branding')
fs.mkdirSync(BRAND_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BRAND_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
    const name = `logo-${Date.now()}${ext}`
    cb(null, name)
  }
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/settings/logo', upload.single('logo'), (req, res) => {
  try{
    if (!req.file) return res.status(400).json({ error: 'logo file is required' })
    const rel = `/assets/branding/${req.file.filename}`
    const s = updateSettings({ LOGO_URL: rel })
    res.json({ settings: s })
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

export default router
