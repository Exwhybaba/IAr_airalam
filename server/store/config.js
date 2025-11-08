import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd(), 'server')
const CFG_DIR = path.join(ROOT, 'config')
const CFG_FILE = path.join(CFG_DIR, 'settings.json')

const defaults = {
  // Backend/IT managed
  INFER_UPSTREAM_URL: process.env.INFER_UPSTREAM_URL || process.env.INFER_URL || 'http://127.0.0.1:7000/api/v1/infer',
  INFER_ASSET_BASE: process.env.INFER_ASSET_BASE || '',
  CONF: process.env.CONF != null ? Number(process.env.CONF) : undefined,
  IOU: process.env.IOU != null ? Number(process.env.IOU) : undefined,
  WBCS_PER_UL_DEFAULT: process.env.WBCS_PER_UL_DEFAULT != null ? Number(process.env.WBCS_PER_UL_DEFAULT) : 8000,
  WRITE_MEM_ALWAYS: String(process.env.WRITE_MEM_ALWAYS || 'false').toLowerCase() === 'true',
  // Organization profile (hospital-facing)
  ORG_NAME: process.env.ORG_NAME || 'Central Medical Laboratory',
  ORG_EMAIL: process.env.ORG_EMAIL || 'info@centrallab.org',
  ORG_PHONE: process.env.ORG_PHONE || '',
  ORG_ADDRESS: process.env.ORG_ADDRESS || '',
  LOGO_URL: process.env.LOGO_URL || '', // e.g. /assets/branding/logo.png
  // Notification preferences (basic toggles)
  NOTIFY_EMAILS_ENABLED: String(process.env.NOTIFY_EMAILS_ENABLED || 'true').toLowerCase() === 'true',
  LOW_CONF_ALERTS_ENABLED: String(process.env.LOW_CONF_ALERTS_ENABLED || 'false').toLowerCase() === 'true',
}

let state = { ...defaults }
try{
  if (fs.existsSync(CFG_FILE)){
    const data = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))
    state = { ...state, ...data }
  }
}catch{}

export function getSettings(){
  return { ...state }
}

export function updateSettings(partial){
  state = { ...state, ...partial }
  try{
    fs.mkdirSync(CFG_DIR, { recursive: true })
    fs.writeFileSync(CFG_FILE, JSON.stringify(state, null, 2), 'utf8')
  }catch{}
  return getSettings()
}

export default { getSettings, updateSettings }
