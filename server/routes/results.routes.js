import express from 'express'
import Result from '../models/Result.js'
import { listResults as listMemResults } from '../store/memory.js'

const router = express.Router()

function toNum(v, def){
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function computeMetrics(doc){
  const total = Number(doc?.summary?.total || (doc?.detections?.length || 0))
  // Confidence: prefer avg_confidence (0..1) then average of detection scores
  const avgConf = (doc?.summary?.avg_confidence != null) ? Number(doc.summary.avg_confidence) : (Array.isArray(doc?.detections) && doc.detections.length ? (doc.detections.reduce((s, d) => s + Number(d?.score || 0), 0) / doc.detections.length) : 0)
  const confidence = Math.round(100 * Math.max(0, Math.min(1, avgConf)))
  // Density: prefer density_per_ul; fallback to density_per_megapixel as-is; else total
  const density_ul = (doc?.summary?.density_per_ul != null) ? Number(doc.summary.density_per_ul) : null
  const density_mpx = (doc?.summary?.density_per_megapixel != null) ? Number(doc.summary.density_per_megapixel) : null
  const density = density_ul != null ? Math.round(density_ul) : (density_mpx != null ? Number(density_mpx.toFixed(2)) : total)
  // Severity: use density thresholds if density per µL known; else fallback to stored severity or heuristic
  let severity = doc?.summary?.severity
  if (density_ul != null){
    if (density_ul > 100000) severity = 'Severe'
    else if (density_ul >= 10000) severity = 'Moderate'
    else if (density_ul > 0) severity = 'Mild'
    else severity = 'None'
  }
  if (!severity){
    severity = (total >= 100 ? 'Severe' : total >= 20 ? 'Moderate' : total > 0 ? 'Low' : 'None')
  }
  const result = total > 0 ? 'Positive' : 'Negative'
  return { total, severity, confidence, density, result }
}

router.get('/results', async (req, res) => {
  try{
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50))
    let docs = []
    try{
      docs = await Result.find({}, null, { sort: { created_at: -1 }, limit })
    } catch (e) {
      // If Mongo is unavailable, fall back to in-memory results only
      docs = []
    }
    const mem = listMemResults()
    const combined = [...docs, ...mem].slice(0, limit)
  const items = combined.map((d) => {
    const m = computeMetrics(d)
    return {
      id: (d._id && d._id.toString) ? d._id.toString() : String(d._id || d.id || ''),
      created_at: d.created_at,
      source_filename: d.source_filename,
      annotated_image_url: d.annotated_image_url,
      // Preserve undefined when not present instead of coercing to 0
      parasite_count: toNum(d?.summary?.parasite_count, undefined),
      wbc_counted: toNum(d?.summary?.wbc_counted, undefined),
      wbcs_per_ul: toNum(d?.summary?.wbcs_per_ul, undefined),
      patientId: d.patientId,
      patientName: d.patientName,
      age: d.age,
      sex: d.sex,
      sampleType: d.sampleType,
      clinician: d.clinician,
      status: 'Completed',
      total: m.total,
      severity: m.severity,
      density: m.density,
      confidence: m.confidence,
      result: m.result,
    }
  })
    res.json({ items, limit })
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

router.get('/results/:id', async (req, res) => {
  try{
    const d = await Result.findById(req.params.id)
    if (!d) return res.status(404).json({ error: 'Not found' })
    const o = d.toObject()
    o.id = o._id
    delete o._id
    const m = computeMetrics(d)
    res.json({ ...o, ...m })
  } catch (e){
    res.status(400).json({ error: 'Invalid id' })
  }
})

// Aggregate patients with last test and counters
router.get('/patients', async (req, res) => {
  try{
    let docsDb = []
    try{
      docsDb = await Result.find({}, null, { sort: { created_at: -1 } })
    }catch{
      docsDb = []
    }
    const docsMem = listMemResults()
    const docs = [...docsDb, ...docsMem].sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const map = new Map()
    for (const d of docs){
      const key = d.patientId || 'Unknown'
      const m = computeMetrics(d)
      if (!map.has(key)){
        map.set(key, {
          id: key,
          name: d.patientName || 'Unknown',
          age: d.age,
          sex: d.sex,
          status: m.result === 'Positive' ? 'Under Treatment' : 'Healthy',
          clinician: d.clinician,
          lastTest: d.created_at,
          totalTests: 0,
          positiveTests: 0,
          lastResult: m.result,
          lastSeverity: m.severity
        })
      }
      const p = map.get(key)
      p.totalTests += 1
      if (m.result === 'Positive') p.positiveTests += 1
      // since docs sorted newest first, first hit is lastTest
    }
    const items = Array.from(map.values())
    res.json({ items })
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

router.get('/patients/:id', async (req, res) => {
  try{
    const pid = req.params.id
    let docsDb = []
    try{
      docsDb = await Result.find({ patientId: pid }, null, { sort: { created_at: -1 } })
    }catch{
      docsDb = []
    }
    const docsMem = listMemResults().filter(r => r.patientId === pid)
    const docs = [...docsDb, ...docsMem].sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (!docs.length) return res.status(404).json({ error: 'Not found' })
    const latest = docs[0]
  const tests = docs.map(d => ({
    id: (d._id && d._id.toString) ? d._id.toString() : String(d._id || d.id || ''),
    date: d.created_at,
    sampleType: d.sampleType,
    ...computeMetrics(d),
    parasite_count: toNum(d?.summary?.parasite_count, undefined),
    wbc_counted: toNum(d?.summary?.wbc_counted, undefined),
    wbcs_per_ul: toNum(d?.summary?.wbcs_per_ul, undefined)
  }))
    // Aggregate lab counts across docs for this patient (if present)
    const agg = docs.reduce((acc, d) => {
      const s = d?.summary || {}
      acc.rbc_parasitized += Number(s.rbc_parasitized || 0)
      acc.rbc_total += Number(s.rbc_total || 0)
      acc.parasite_count += Number(s.parasite_count || 0)
      acc.wbc_counted += Number(s.wbc_counted || 0)
      acc.wbcs_per_ul = Number(s.wbcs_per_ul || acc.wbcs_per_ul || 8000)
      return acc
    }, { rbc_parasitized:0, rbc_total:0, parasite_count:0, wbc_counted:0, wbcs_per_ul:8000 })
    let density_per_ul = undefined
    let parasitemia_percent = undefined
    let calc_method = 'none'
    if (agg.parasite_count > 0 && agg.wbc_counted > 0) {
      density_per_ul = (agg.parasite_count / agg.wbc_counted) * (agg.wbcs_per_ul || 8000)
      calc_method = 'wbc'
    }
    if (agg.rbc_parasitized > 0 && agg.rbc_total > 0){
      parasitemia_percent = (agg.rbc_parasitized / agg.rbc_total) * 100
      if (calc_method === 'none') calc_method = 'rbc'
    }
    let agg_severity = undefined
    if (typeof density_per_ul === 'number'){
      if (density_per_ul > 100000) agg_severity = 'Severe'
      else if (density_per_ul >= 10000) agg_severity = 'Moderate'
      else if (density_per_ul > 0) agg_severity = 'Mild'
      else agg_severity = 'None'
    }
    res.json({
      id: pid,
      name: latest.patientName || 'Unknown',
      age: latest.age,
      sex: latest.sex,
      clinician: latest.clinician,
      lastTest: latest.created_at,
      totalTests: docs.length,
      positiveTests: tests.filter(t => t.result === 'Positive').length,
      lastResult: tests[0]?.result,
      lastSeverity: tests[0]?.severity,
      aggregate: { density_per_ul, parasitemia_percent, calc_method, severity: agg_severity, ...agg },
      tests
    })
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

export default router
