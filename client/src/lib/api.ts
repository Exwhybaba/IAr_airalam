// Minimal API utility for MalariaAI backend

// Prefer an explicit env var; allow 'relative' to use same-origin; allow localStorage override
function resolveApiBase(){
  try{
    if (typeof window !== 'undefined'){
      const ov = window.localStorage.getItem('API_BASE_URL_OVERRIDE')
      if (ov) return String(ov)
    }
  }catch{}
  const RAW_API_URL =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
      ? String((import.meta as any).env?.VITE_API_URL)
      : undefined
  return RAW_API_URL === 'relative' ? '' : RAW_API_URL || 'http://localhost:5000'
}
const API_BASE_URL = resolveApiBase();

export async function inferSingle(
  file: File,
  patient: {
    patientId: string;
    patientName: string;
    age?: string | number;
    sex?: string;
    sampleType?: string;
    clinician?: string;
  },
  lab?: {
    rbc_parasitized?: number | string;
    rbc_total?: number | string;
    parasite_count?: number | string;
    wbc_counted?: number | string;
    wbcs_per_ul?: number | string;
  }
) {
  const form = new FormData();
  form.append('file', file);
  form.append('patientId', patient.patientId);
  form.append('patientName', patient.patientName);
  if (patient.age) form.append('age', String(patient.age));
  if (patient.sex) form.append('sex', patient.sex);
  if (patient.sampleType) form.append('sampleType', patient.sampleType);
  if (patient.clinician) form.append('clinician', patient.clinician);
  if (lab) {
    if (lab.rbc_parasitized != null) form.append('rbc_parasitized', String(lab.rbc_parasitized));
    if (lab.rbc_total != null) form.append('rbc_total', String(lab.rbc_total));
    if (lab.parasite_count != null) form.append('parasite_count', String(lab.parasite_count));
    if (lab.wbc_counted != null) form.append('wbc_counted', String(lab.wbc_counted));
    if (lab.wbcs_per_ul != null) form.append('wbcs_per_ul', String(lab.wbcs_per_ul));
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/infer`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


export async function inferBatch(
  files: File[],
  patients: Array<{
    patientId: string;
    patientName: string;
    age?: string | number;
    sex?: string;
    sampleType?: string;
    clinician?: string;
  }>,
  lab?: {
    rbc_parasitized?: (number | string)[];
    rbc_totals?: (number | string)[];
    parasite_counts?: (number | string)[];
    wbc_counteds?: (number | string)[];
    wbcs_per_uls?: (number | string)[];
  },
  options?: { aggregateBatch?: boolean, batchLab?: { rbc_parasitized?: string|number, rbc_total?: string|number, parasite_count?: string|number, wbc_counted?: string|number, wbcs_per_ul?: string|number } }
) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  // Append patient metadata one-by-one so the server receives arrays
  patients.forEach((p) => form.append('patientIds', p.patientId ?? ''));
  patients.forEach((p) => form.append('patientNames', p.patientName ?? ''));
  patients.forEach((p) => form.append('ages', p.age != null ? String(p.age) : ''));
  patients.forEach((p) => form.append('sexes', p.sex ?? ''));
  patients.forEach((p) => form.append('sampleTypes', p.sampleType ?? ''));
  patients.forEach((p) => form.append('clinicians', p.clinician ?? ''));
  if (options?.aggregateBatch) form.append('aggregateBatch', 'true');
  if (options?.batchLab){
    const bl = options.batchLab
    if (bl.rbc_parasitized != null) form.append('batch_rbc_parasitized', String(bl.rbc_parasitized))
    if (bl.rbc_total != null) form.append('batch_rbc_total', String(bl.rbc_total))
    if (bl.parasite_count != null) form.append('batch_parasite_count', String(bl.parasite_count))
    if (bl.wbc_counted != null) form.append('batch_wbc_counted', String(bl.wbc_counted))
    if (bl.wbcs_per_ul != null) form.append('batch_wbcs_per_ul', String(bl.wbcs_per_ul))
  }
  if (lab) {
    lab.rbc_parasitized?.forEach((v) => form.append('rbc_parasitized', String(v ?? '')));
    lab.rbc_totals?.forEach((v) => form.append('rbc_totals', String(v ?? '')));
    lab.parasite_counts?.forEach((v) => form.append('parasite_counts', String(v ?? '')));
    lab.wbc_counteds?.forEach((v) => form.append('wbc_counteds', String(v ?? '')));
    lab.wbcs_per_uls?.forEach((v) => form.append('wbcs_per_uls', String(v ?? '')));
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/infer/batch`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Results and Patients APIs
export async function listResults(limit = 100) {
  const res = await fetch(`${API_BASE_URL}/api/v1/results?limit=${encodeURIComponent(String(limit))}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ items: Array<any> }>
}

export async function getResult(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/results/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listPatients() {
  const res = await fetch(`${API_BASE_URL}/api/v1/patients`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ items: Array<any> }>
}

export async function getPatient(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/patients/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Settings API
export async function getSettings(){
  const res = await fetch(`${API_BASE_URL}/api/v1/settings`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ settings: any }>
}
export async function updateSettings(p: any){
  const res = await fetch(`${API_BASE_URL}/api/v1/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ settings: any }>
}

export async function uploadLogo(file: File){
  const form = new FormData()
  form.append('logo', file)
  const res = await fetch(`${API_BASE_URL}/api/v1/settings/logo`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ settings: any }>
}

// Health
export async function health(){
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
