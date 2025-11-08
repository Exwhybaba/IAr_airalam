import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import dns from 'dns'
import http from 'http'
import https from 'https'
import Result from '../models/Result.js'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { addResult as addMemResult } from '../store/memory.js'
import { getSettings } from '../store/config.js'

const router = express.Router()

const ROOT = path.resolve(process.cwd(), 'server')
const UPLOAD_DIR = path.join(ROOT, 'uploads')
const PUBLIC_DIR = path.join(ROOT, 'public')
const ANNO_DIR = path.join(PUBLIC_DIR, 'annotated')
for (const d of [UPLOAD_DIR, PUBLIC_DIR, ANNO_DIR]){ fs.mkdirSync(d, { recursive: true }) }

const storage = multer.diskStorage({
  destination: (_req, _file, cb)=>cb(null, UPLOAD_DIR),
  filename: (_req, file, cb)=>cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_')}`)
})
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } })

function normalizeLocalUrl(url){
  try{
    // Quick string-level normalization first (handles invalid bracket-less IPv6)
    let s = String(url || '')
    s = s.replace('::1', '127.0.0.1').replace('localhost', '127.0.0.1')
    const u = new URL(s)
    if (u.hostname === 'localhost' || u.hostname === '::1') u.hostname = '127.0.0.1'
    return u.toString()
  }catch{ 
    // Final fallback string replace
    return String(url || '').replace('::1', '127.0.0.1').replace('localhost', '127.0.0.1')
  }
}

function resolveUpstream(){
  // Prefer runtime settings, fall back to env and sane default
  const s = getSettings?.() || {}
  const raw = s.INFER_UPSTREAM_URL || process.env.INFER_UPSTREAM_URL || 'http://127.0.0.1:7000/api/v1/infer'
  const full = normalizeLocalUrl(raw)
  const base = (s.INFER_ASSET_BASE && String(s.INFER_ASSET_BASE)) || full.replace(/\/?api\/v1\/?infer.*/i, '')
  return { url: full, assetBase: base }
}

function makeIPv4Agent(url){
  const lookup = (hostname, options, callback) => dns.lookup(hostname, { ...options, family: 4 }, callback)
  return url.startsWith('https://')
    ? new https.Agent({ keepAlive: true, lookup })
    : new http.Agent({ keepAlive: true, lookup })
}

async function generateUniquePatientId() {
  for (let i = 0; i < 5; i++) {
    const dt = new Date()
    const y = String(dt.getFullYear()).slice(-2)
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
    const id = `P-${y}${m}${d}-${rand}`
    const exists = await Result.exists({ patientId: id })
    if (!exists) return id
  }
  return `P-${Date.now().toString(36).toUpperCase()}`
}

function toNum(v, def = undefined){
  if (v == null) return def
  if (typeof v === 'string' && v.trim() === '') return def
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function computeLabMetrics(group){
  const wbcsPerUl = toNum(group.wbcs_per_ul, (getSettings && getSettings().WBCS_PER_UL_DEFAULT) || 8000)
  const parasiteSum = toNum(group.parasite_count, 0) || 0
  const wbcCountedSum = toNum(group.wbc_counted, 0) || 0
  const rbcParasitizedSum = toNum(group.rbc_parasitized, 0) || 0
  const rbcTotalSum = toNum(group.rbc_total, 0) || 0

  let density_per_ul = undefined
  let parasitemia_percent = undefined
  let calc_method = 'none'
  if (parasiteSum > 0 && wbcCountedSum > 0) {
    density_per_ul = (parasiteSum / wbcCountedSum) * (wbcsPerUl || 8000)
    calc_method = 'wbc'
  }
  if (rbcParasitizedSum > 0 && rbcTotalSum > 0) {
    parasitemia_percent = (rbcParasitizedSum / rbcTotalSum) * 100
    if (calc_method === 'none') calc_method = 'rbc'
  }

  // Severity based on density thresholds if available
  let severity = undefined
  if (typeof density_per_ul === 'number'){
    if (density_per_ul > 100000) severity = 'Severe'
    else if (density_per_ul >= 10000) severity = 'Moderate'
    else if (density_per_ul > 0) severity = 'Mild'
    else severity = 'None'
  }

  return { density_per_ul, parasitemia_percent, calc_method, severity, wbcs_per_ul: wbcsPerUl, rbc_parasitized: rbcParasitizedSum, rbc_total: rbcTotalSum, parasite_count: parasiteSum, wbc_counted: wbcCountedSum }
}

// Derive fallback counts from detection labels when lab inputs are not provided.
// Heuristics: count detections whose label contains 'troph' (trophozoite) or 'parasite' as parasites;
// count labels containing 'wbc' or 'white blood' or 'leukocyte' as WBCs.
function deriveCountsFromDetections(dets){
  const out = { parasite_count: 0, wbc_counted: 0 }
  try{
    if (!Array.isArray(dets)) return out
    for (const d of dets){
      const lbl = String(d?.label || '').toLowerCase()
      if (!lbl) continue
      // Narrow parasite heuristics to avoid counting RBC labels
      if (lbl.includes('troph') || lbl.includes('tropho') || lbl.includes('parasite') || lbl.includes('ring')) out.parasite_count += 1
      if (lbl.includes('wbc') || lbl.includes('white blood') || lbl.includes('leukocyte')) out.wbc_counted += 1
    }
  }catch{}
  return out
}

function deriveCountsFromSummary(py){
  const out = { parasite_count: 0, wbc_counted: 0 }
  try{
    // Prefer explicit counts if provided by upstream
    const sc = py && py.summary && (py.summary.counts_by_category || {})
    const tc = (sc && (Number(sc.trophozoites)))
    const wc = (sc && (Number(sc.wbcs)))
    if (Number.isFinite(tc) && tc > 0) out.parasite_count = Number(tc)
    if (Number.isFinite(wc) && wc > 0) out.wbc_counted = Number(wc)
  const bc = py && py.summary && py.summary.by_class
  const total = Number(py && py.summary && py.summary.total || 0)
  if ((out.parasite_count === 0 && out.wbc_counted === 0) && bc && typeof bc === 'object'){
    for (const [k, v] of Object.entries(bc)){
      const lbl = String(k || '').toLowerCase()
      const cnt = Number(v || 0)
      if (!lbl) continue
      if (lbl.includes('wbc') || lbl.includes('white blood') || lbl.includes('leukocyte')) out.wbc_counted += cnt
      // Narrow parasite heuristics to avoid counting RBC labels
      if (lbl.includes('troph') || lbl.includes('tropho') || lbl.includes('parasite') || lbl.includes('ring')) out.parasite_count += cnt
    }
    // As a last resort, if no explicit parasite labels found but there is a total, assume non-WBC are parasites
    if (out.parasite_count === 0 && total > 0){
      const p = total - out.wbc_counted
      if (p > 0) out.parasite_count = p
    }
  }
  }catch{}
  return out
}

  router.post('/infer', upload.single('file'), async (req, res) => {
    try {
    if (!req.file) return res.status(400).json({ error: 'file is required' })
    const { url: INFER_UPSTREAM_URL, assetBase: INFER_ASSET_BASE } = resolveUpstream()
    if (!INFER_UPSTREAM_URL) return res.status(500).json({ error: 'Upstream inference URL not configured' })
    const form = new (await import('form-data')).default()
    form.append('file', fs.createReadStream(req.file.path), { filename: req.file.originalname })
    const settings = getSettings?.() || {}
    const params = {}
    if (req.query.conf) params.conf = Number(req.query.conf)
    else if (settings.CONF != null) params.conf = Number(settings.CONF)
    if (req.query.iou) params.iou = Number(req.query.iou)
    else if (settings.IOU != null) params.iou = Number(settings.IOU)
    const agent = makeIPv4Agent(INFER_UPSTREAM_URL)
    const r = await axios.post(INFER_UPSTREAM_URL, form, { params, headers: form.getHeaders(), httpAgent: agent, httpsAgent: agent, maxContentLength: Infinity, maxBodyLength: Infinity })
    const py = r.data
    // Normalize annotated image URL so the client can render it directly
    if (py && py.annotated_image_url) {
      const url = String(py.annotated_image_url)
      if (!/^https?:\/\//i.test(url)) {
        py.annotated_image_url = `${INFER_ASSET_BASE}${url}`
      }
    }
    // Resolve or autogenerate patientId
    const resolvedPatientId = (req.body.patientId && String(req.body.patientId).trim())
      ? String(req.body.patientId).trim()
      : await generateUniquePatientId()
    // Extract optional lab inputs (single), prefer summary counts, then detections
    const sumCounts = deriveCountsFromSummary(py)
    const detCountsRaw = deriveCountsFromDetections(py?.detections)
    const detCounts = {
      parasite_count: (Number(sumCounts.parasite_count) > 0 ? Number(sumCounts.parasite_count) : Number(detCountsRaw.parasite_count) || 0),
      wbc_counted: (Number(sumCounts.wbc_counted) > 0 ? Number(sumCounts.wbc_counted) : Number(detCountsRaw.wbc_counted) || 0)
    }
    const labInput = {
      rbc_parasitized: toNum(req.body.rbc_parasitized),
      rbc_total: toNum(req.body.rbc_total),
      parasite_count: toNum(req.body.parasite_count, detCounts.parasite_count),
      wbc_counted: toNum(req.body.wbc_counted, detCounts.wbc_counted),
      wbcs_per_ul: toNum(req.body.wbcs_per_ul, 8000)
    }
    const labMetrics = computeLabMetrics(labInput)
    // Persist only if Mongo connection is ready
    let id = undefined
    let wroteDb = false
    if (mongoose.connection?.readyState === 1) {
      const annoUrl = py.annotated_image_url
        ? (/^https?:\/\//i.test(String(py.annotated_image_url))
            ? String(py.annotated_image_url)
            : `${INFER_ASSET_BASE}${String(py.annotated_image_url)}`)
        : undefined
      // merge summary with lab metrics and fallback severity
      const baseSeverity = labMetrics.severity || py.summary?.severity
      const mergedSummary = {
        ...(py.summary || {}),
        avg_confidence: py.summary?.avg_confidence,
        density_per_ul: labMetrics.density_per_ul,
        parasitemia_percent: labMetrics.parasitemia_percent,
        calc_method: labMetrics.calc_method,
        rbc_parasitized: labMetrics.rbc_parasitized,
        rbc_total: labMetrics.rbc_total,
        parasite_count: labMetrics.parasite_count,
        wbc_counted: labMetrics.wbc_counted,
        wbcs_per_ul: labMetrics.wbcs_per_ul,
        severity: baseSeverity
      }
      const doc = await Result.create({
        source_filename: py.source_filename || req.file.originalname,
        original_image_url: `/uploads/${path.basename(req.file.path)}`,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        annotated_image_url: annoUrl,
        annotated_images: annoUrl ? [annoUrl] : undefined,
        detections: py.detections,
        summary: mergedSummary,
        thresholds: { conf: params.conf, iou: params.iou },
        patientId: resolvedPatientId,
        patientName: req.body.patientName,
        age: req.body.age ? Number(req.body.age) : undefined,
        sex: req.body.sex,
        sampleType: req.body.sampleType,
        clinician: req.body.clinician
      })
      id = doc._id.toString()
      wroteDb = true
    }
    const payload = { ...py, id, patientId: resolvedPatientId, annotated_images: (py.annotated_image_url ? [String(py.annotated_image_url)] : undefined), summary: { ...(py.summary || {}), ...labMetrics, severity: labMetrics.severity || py.summary?.severity } }
    const writeMemAlways = Boolean((getSettings?.() || {}).WRITE_MEM_ALWAYS)
    if (!id || writeMemAlways){
      // Store a minimal in-memory result so UI has data without Mongo
      const memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
      addMemResult({
        _id: memId,
        created_at: new Date(),
        patientId: resolvedPatientId,
        patientName: req.body.patientName,
        age: req.body.age ? Number(req.body.age) : undefined,
        sex: req.body.sex,
        sampleType: req.body.sampleType,
        clinician: req.body.clinician,
        source_filename: py.source_filename || req.file.originalname,
        annotated_image_url: payload.summary?.annotated_image_url || payload.annotated_image_url,
        annotated_images: payload.annotated_images,
        detections: py.detections,
        summary: payload.summary
      })
      payload.id = payload.id || memId
    }
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: e?.response?.data || e.message })
  }
})

  router.post('/infer/batch', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: 'files are required' })
    const { url: INFER_UPSTREAM_URL, assetBase: INFER_ASSET_BASE } = resolveUpstream()
    if (!INFER_UPSTREAM_URL) return res.status(500).json({ error: 'Upstream inference URL not configured' })
    const settings = getSettings?.() || {}
    // Whether to aggregate the entire batch as a single sample/result
    const aggregateRequested = String(req.body.aggregateBatch || req.query.aggregateBatch || '').toLowerCase() === 'true'
    // Accept patient metadata as arrays (one per file) or single values
    const {
      patientIds = [],
      patientNames = [],
      ages = [],
      sexes = [],
      sampleTypes = [],
      clinicians = []
    } = req.body;
    const aget = (sing, plur, idx) => {
      const p = req.body[plur]
      const s = req.body[sing]
      const v = Array.isArray(p) ? p[idx] : (Array.isArray(s) ? s[idx] : (p ?? s))
      return v
    }
    const interim = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try{
        const FormData = (await import('form-data')).default
        const form = new FormData()
        form.append('file', fs.createReadStream(f.path), { filename: f.originalname })
        const params = {}
        if (req.query.conf) params.conf = Number(req.query.conf)
        else if (settings.CONF != null) params.conf = Number(settings.CONF)
        if (req.query.iou) params.iou = Number(req.query.iou)
        else if (settings.IOU != null) params.iou = Number(settings.IOU)
        const agent = makeIPv4Agent(INFER_UPSTREAM_URL)
    const r = await axios.post(INFER_UPSTREAM_URL, form, { params, headers: form.getHeaders(), httpAgent: agent, httpsAgent: agent, maxContentLength: Infinity, maxBodyLength: Infinity })
        const py = r.data
        if (py && py.annotated_image_url) {
          const url = String(py.annotated_image_url)
          if (!/^https?:\/\//i.test(url)) py.annotated_image_url = `${INFER_ASSET_BASE}${url}`
        }
        // Prefer counts from summary, then fill from detections
        const sc = deriveCountsFromSummary(py)
        const dcRaw = deriveCountsFromDetections(py?.detections)
        const dc = {
          parasite_count: (Number(sc.parasite_count) > 0 ? Number(sc.parasite_count) : Number(dcRaw.parasite_count) || 0),
          wbc_counted: (Number(sc.wbc_counted) > 0 ? Number(sc.wbc_counted) : Number(dcRaw.wbc_counted) || 0)
        }
        const anno = py?.annotated_image_url ? String(py.annotated_image_url) : undefined
        const provided = Array.isArray(patientIds) ? patientIds[i] : patientIds
        const pid = (provided && String(provided).trim()) ? String(provided).trim() : await generateUniquePatientId()
        const pc_in = toNum(aget('parasite_count', 'parasite_counts', i))
        const wc_in = toNum(aget('wbc_counted', 'wbc_counteds', i))
        interim.push({
          file: f,
          py,
          anno,
          pid,
          patientName: Array.isArray(patientNames) ? patientNames[i] : patientNames,
          age: Array.isArray(ages) ? (ages[i] ? Number(ages[i]) : undefined) : (ages ? Number(ages) : undefined),
          sex: Array.isArray(sexes) ? sexes[i] : sexes,
          sampleType: Array.isArray(sampleTypes) ? sampleTypes[i] : sampleTypes,
          clinician: Array.isArray(clinicians) ? clinicians[i] : clinicians,
          rbc_parasitized: toNum(aget('rbc_parasitized', 'rbc_parasitized', i)),
          rbc_total: toNum(aget('rbc_total', 'rbc_totals', i)),
          parasite_count: (pc_in != null ? pc_in : dc.parasite_count),
          wbc_counted: (wc_in != null ? wc_in : dc.wbc_counted),
          wbcs_per_ul: toNum(aget('wbcs_per_ul','wbcs_per_uls', i), 8000)
        })
      } catch (e) {
        interim.push({ error: e?.response?.data || e.message, file: f })
      }
    }

    // Aggregate per patient
    const byPatient = new Map()
    for (const it of interim){
      if (it.error) continue
      const g = byPatient.get(it.pid) || { rbc_parasitized:0, rbc_total:0, parasite_count:0, wbc_counted:0, wbcs_per_ul: it.wbcs_per_ul || 8000, items: [] }
      g.rbc_parasitized += toNum(it.rbc_parasitized,0) || 0
      g.rbc_total += toNum(it.rbc_total,0) || 0
      g.parasite_count += toNum(it.parasite_count,0) || 0
      g.wbc_counted += toNum(it.wbc_counted,0) || 0
      // if different wbcs_per_ul provided, keep latest non-empty
      if (toNum(it.wbcs_per_ul)) g.wbcs_per_ul = toNum(it.wbcs_per_ul)
      g.items.push(it)
      byPatient.set(it.pid, g)
    }

    const items = []
    const aggregates = {}
    for (const [pid, g] of byPatient.entries()){
      const metrics = computeLabMetrics(g)
      aggregates[pid] = metrics
      for (const it of g.items){
        try{
          let id = undefined
          let memIdForItem = undefined
          const writeMemAlways = Boolean((getSettings?.() || {}).WRITE_MEM_ALWAYS)
          if (!aggregateRequested){
            if (mongoose.connection?.readyState === 1) {
              const annoUrl = it.py.annotated_image_url
                ? (/^https?:\/\//i.test(String(it.py.annotated_image_url))
                    ? String(it.py.annotated_image_url)
                    : `${INFER_ASSET_BASE}${String(it.py.annotated_image_url)}`)
                : undefined
              // Compute per-item lab metrics (not per-patient aggregates)
              const imetrics = computeLabMetrics({
                rbc_parasitized: toNum(it.rbc_parasitized, undefined),
                rbc_total: toNum(it.rbc_total, undefined),
                parasite_count: toNum(it.parasite_count, undefined),
                wbc_counted: toNum(it.wbc_counted, undefined),
                wbcs_per_ul: toNum(it.wbcs_per_ul, undefined)
              })
              const mergedSummary = {
                ...(it.py.summary || {}),
                avg_confidence: it.py.summary?.avg_confidence,
                density_per_ul: imetrics.density_per_ul,
                parasitemia_percent: imetrics.parasitemia_percent,
                calc_method: imetrics.calc_method,
                rbc_parasitized: imetrics.rbc_parasitized,
                rbc_total: imetrics.rbc_total,
                parasite_count: imetrics.parasite_count,
                wbc_counted: imetrics.wbc_counted,
                wbcs_per_ul: imetrics.wbcs_per_ul,
                severity: imetrics.severity || it.py.summary?.severity
              }
              const doc = await Result.create({
                source_filename: it.py.source_filename || it.file.originalname,
                original_image_url: `/uploads/${path.basename(it.file.path)}`,
                mime_type: it.file.mimetype,
                file_size: it.file.size,
                annotated_image_url: annoUrl,
                detections: it.py.detections,
                summary: mergedSummary,
                thresholds: { 
                  conf: toNum(req.query.conf, settings.CONF), 
                  iou: toNum(req.query.iou, settings.IOU) 
                },
                patientId: pid,
                patientName: it.patientName,
                age: it.age,
                sex: it.sex,
                sampleType: it.sampleType,
                clinician: it.clinician
              })
              id = doc._id.toString()
            }
          }
          const imetrics = computeLabMetrics({
            rbc_parasitized: toNum(it.rbc_parasitized, undefined),
            rbc_total: toNum(it.rbc_total, undefined),
            parasite_count: toNum(it.parasite_count, undefined),
            wbc_counted: toNum(it.wbc_counted, undefined),
            wbcs_per_ul: toNum(it.wbcs_per_ul, undefined)
          })
          const itemPayload = { id: id || it.file.originalname, status: 'done', result: { ...it.py, patientId: pid, summary: { ...(it.py.summary||{}), ...imetrics, severity: imetrics.severity || it.py.summary?.severity } } }
          if (!aggregateRequested){
            if (!id || writeMemAlways){
              memIdForItem = `mem-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
              addMemResult({
                _id: memIdForItem,
                created_at: new Date(),
                patientId: pid,
                patientName: it.patientName,
                age: it.age,
                sex: it.sex,
                sampleType: it.sampleType,
                clinician: it.clinician,
                source_filename: it.py.source_filename || it.file.originalname,
                annotated_image_url: itemPayload.result?.annotated_image_url,
                detections: it.py.detections,
                summary: itemPayload.result.summary
              })
              itemPayload.id = id || memIdForItem
            }
          }
          items.push(itemPayload)
        } catch (e) {
          items.push({ id: it.file.originalname, status: 'error', error: e?.response?.data || e.message })
        }
      }
    }
    // include items that errored earlier
    for (const it of interim){ if (it.error){ items.push({ id: it.file?.originalname || 'unknown', status: 'error', error: it.error }) } }

    // Optional: aggregate all images in this batch as one sample
    let batch_aggregate = undefined
    let annos = []
    if (aggregateRequested){
      const sum = { totalDetections: 0, areaMpx: 0, byClass: new Map(), confSum: 0, confCount: 0,
        rbc_parasitized:0, rbc_total:0, parasite_count:0, wbc_counted:0, wbcs_per_ul: undefined }
      for (const it of interim){
        if (it.error || !it.py) continue
        const s = it.py.summary || {}
        const total = Number(s.total || (Array.isArray(it.py.detections) ? it.py.detections.length : 0))
        sum.totalDetections += total
        const area = Number(s.area_megapixels || 0)
        if (area > 0) sum.areaMpx += area
        const avgc = Number(s.avg_confidence || 0)
        if (!isNaN(avgc)) { sum.confSum += avgc; sum.confCount += 1 }
        const bc = s.by_class || {}
        if (bc && typeof bc === 'object'){
          for (const [k,v] of Object.entries(bc)){
            sum.byClass.set(k, (sum.byClass.get(k) || 0) + Number(v || 0))
          }
        }
        // aggregate lab raw counts; prefer per-item resolved values
        sum.rbc_parasitized += Number(it.rbc_parasitized || s.rbc_parasitized || 0)
        sum.rbc_total += Number(it.rbc_total || s.rbc_total || 0)
        sum.parasite_count += Number(it.parasite_count || s.parasite_count || 0)
        sum.wbc_counted += Number(it.wbc_counted || s.wbc_counted || 0)
        if (sum.wbcs_per_ul == null && (it.wbcs_per_ul != null || s.wbcs_per_ul != null)) sum.wbcs_per_ul = Number(it.wbcs_per_ul || s.wbcs_per_ul)
        if (it.anno) annos.push(String(it.anno))
      }
      const density_per_megapixel = sum.areaMpx > 0 ? (sum.totalDetections / sum.areaMpx) : undefined
      const avg_confidence = sum.confCount > 0 ? (sum.confSum / sum.confCount) : undefined
      // Batch-level lab override if provided
      const batchLab = {
        rbc_parasitized: toNum(req.body.batch_rbc_parasitized),
        rbc_total: toNum(req.body.batch_rbc_total),
        parasite_count: toNum(req.body.batch_parasite_count),
        wbc_counted: toNum(req.body.batch_wbc_counted),
        wbcs_per_ul: toNum(req.body.batch_wbcs_per_ul)
      }
      const hasBatchLab = [batchLab.rbc_parasitized, batchLab.rbc_total, batchLab.parasite_count, batchLab.wbc_counted, batchLab.wbcs_per_ul]
        .some(v => typeof v === 'number' && !isNaN(v))
      const labMetrics = hasBatchLab ? computeLabMetrics(batchLab) : computeLabMetrics({
        rbc_parasitized: sum.rbc_parasitized,
        rbc_total: sum.rbc_total,
        parasite_count: sum.parasite_count,
        wbc_counted: sum.wbc_counted,
        wbcs_per_ul: sum.wbcs_per_ul
      })
      let severity = labMetrics.severity
      if (!severity){
        const t = sum.totalDetections
        severity = (t >= 100 ? 'Severe' : t >= 20 ? 'Moderate' : t > 0 ? 'Low' : 'None')
      }
      batch_aggregate = {
        detections_total: sum.totalDetections,
        by_class: Object.fromEntries(sum.byClass.entries()),
        density_per_megapixel,
        avg_confidence,
        ...labMetrics,
        severity
      }

      // Create a single aggregated Result document (or memory entry) and use its id for all items
      let aggregate_id = undefined
      try{
        const patientIds = Array.from(byPatient.keys && byPatient.keys() || [])
        const primaryPid = Array.isArray(patientIds) && patientIds.length === 1 ? patientIds[0] : undefined
        const confDef = toNum(req.query.conf, settings.CONF)
        const iouDef = toNum(req.query.iou, settings.IOU)
        const first = interim.find(it => !it.error)
        const summary = {
          total: batch_aggregate.detections_total,
          by_class: batch_aggregate.by_class,
          counts_by_category: {
            trophozoites: Number(batch_aggregate.parasite_count || 0),
            wbcs: Number(batch_aggregate.wbc_counted || 0)
          },
          density_per_megapixel: batch_aggregate.density_per_megapixel,
          avg_confidence: batch_aggregate.avg_confidence,
          density_per_ul: batch_aggregate.density_per_ul,
          parasitemia_percent: batch_aggregate.parasitemia_percent,
          calc_method: batch_aggregate.calc_method,
          rbc_parasitized: batch_aggregate.rbc_parasitized,
          rbc_total: batch_aggregate.rbc_total,
          parasite_count: batch_aggregate.parasite_count,
          wbc_counted: batch_aggregate.wbc_counted,
          wbcs_per_ul: batch_aggregate.wbcs_per_ul,
          severity: batch_aggregate.severity,
          rationale: `Aggregated from ${interim.filter(it=>!it.error).length} images`
        }
        if (mongoose.connection?.readyState === 1){
          const doc = await Result.create({
            source_filename: `batch-${Date.now()}-${interim.filter(it=>!it.error).length}images`,
            original_image_url: undefined,
            mime_type: 'application/vnd.malaria.batch',
            file_size: undefined,
            annotated_image_url: annos[0],
            annotated_images: annos,
            detections: [],
            summary,
            thresholds: { conf: confDef, iou: iouDef },
            patientId: primaryPid,
            patientName: first?.patientName,
            age: (first?.age != null ? Number(first.age) : undefined),
            sex: first?.sex,
            sampleType: first?.sampleType,
            clinician: first?.clinician
          })
          aggregate_id = doc._id.toString()
        } else {
          const memId = `mem-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
          addMemResult({ _id: memId, created_at: new Date(), patientId: primaryPid, patientName: first?.patientName, age: first?.age, sex: first?.sex, sampleType: first?.sampleType, clinician: first?.clinician, source_filename: `batch-${Date.now()}`, annotated_image_url: annos[0], annotated_images: annos, detections: [], summary })
          aggregate_id = memId
        }
        if (aggregate_id){
          for (const it of items){ if (it && typeof it === 'object') it.id = aggregate_id }
        }
      }catch{}
    }

    res.json({ batch_id: Date.now().toString(), items, aggregates, batch_aggregate, batch_annotated_images: (aggregateRequested ? annos : undefined), aggregate_id: (aggregateRequested && (items[0]?.id)) || undefined })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
