// Lightweight client-side export helpers (no external deps)
// - CSV export for results table selections
// - Print-friendly HTML report for a single result (user can "Save as PDF")

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function exportResultsCSV(rows: any[], filename = 'results.csv') {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const headers = [
    'id', 'created_at', 'patientId', 'patientName', 'age', 'sex', 'sampleType',
    'result', 'severity', 'total', 'density', 'confidence',
    'parasite_count', 'wbc_counted', 'wbcs_per_ul', 'annotated_image_url'
  ];
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers
      .map((h) => {
        const v = (r && r[h] !== undefined && r[h] !== null) ? r[h] : '';
        // basic CSV escaping
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      })
      .join(',')
    )
  ].join('\n');
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

export function openPrintWindowForResult(result: any, org?: any) {
  if (!result) return;
  const title = `Result_${result.id || 'report'}`;
  const styles = `
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111827; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    h2 { font-size: 16px; margin: 16px 0 8px 0; }
    .muted { color: #6B7280; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; }
    .kv { display: grid; grid-template-columns: 180px 1fr; gap: 8px; font-size: 14px; }
    .img { page-break-inside: avoid; margin-top: 8px; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; }
    .img img { max-width: 100%; height: auto; }
    .logo { height: 28px; object-fit: contain; }
    @media print { .no-print { display: none; } }
  `;
  const fmtDate = (s?: string) => s ? new Date(s).toLocaleString() : '';
  const headerHtml = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        ${org?.LOGO_URL ? `<img class="logo" src="${org.LOGO_URL}" alt="Logo" />` : ''}
        <div>
          <h1>${org?.ORG_NAME || 'MalariaAI Report'}</h1>
          <div class="muted">${org?.ORG_ADDRESS || ''}</div>
        </div>
      </div>
      <div class="muted">Generated: ${new Date().toLocaleString()}</div>
    </div>
  `;
  const metricsHtml = `
    <div class="grid">
      <div class="card">
        <h2>Patient</h2>
        <div class="kv">
          <div>Patient Name</div><div>${result?.patientName || '-'}</div>
          <div>Patient ID</div><div>${result?.patientId || '-'}</div>
          <div>Age / Sex</div><div>${result?.age ?? '-'} / ${result?.sex || '-'}</div>
          <div>Clinician</div><div>${result?.clinician || '-'}</div>
        </div>
      </div>
      <div class="card">
        <h2>Sample</h2>
        <div class="kv">
          <div>Result ID</div><div>${result?.id || '-'}</div>
          <div>Sample Type</div><div>${result?.sampleType || '-'}</div>
          <div>Created</div><div>${fmtDate(result?.created_at)}</div>
          <div>Updated</div><div>${fmtDate(result?.updated_at)}</div>
        </div>
      </div>
      <div class="card">
        <h2>Summary</h2>
        <div class="kv">
          <div>Result</div><div>${result?.result || '-'}</div>
          <div>Severity</div><div>${result?.severity || '-'}</div>
          <div>Total Parasites</div><div>${result?.total ?? '-'}</div>
          <div>Confidence</div><div>${result?.confidence != null ? result.confidence + '%' : '-'}</div>
          <div>Density</div><div>${result?.density != null ? result.density : '-'} ${result?.summary?.density_per_ul != null ? '/µL' : ''}</div>
        </div>
      </div>
      <div class="card">
        <h2>Lab Counts</h2>
        <div class="kv">
          <div>Trophozoites</div><div>${result?.summary?.parasite_count ?? result?.parasite_count ?? '-'}</div>
          <div>WBCs Counted</div><div>${result?.summary?.wbc_counted ?? result?.wbc_counted ?? '-'}</div>
          <div>Assumed WBCs/µL</div><div>${result?.summary?.wbcs_per_ul ?? result?.wbcs_per_ul ?? '-'}</div>
          <div>Parasitized RBCs</div><div>${result?.summary?.rbc_parasitized ?? '-'}</div>
          <div>Total RBCs</div><div>${result?.summary?.rbc_total ?? '-'}</div>
        </div>
      </div>
    </div>
  `;
  const imgs: string[] = Array.isArray(result?.annotated_images) && result.annotated_images.length
    ? result.annotated_images
    : (result?.annotated_image_url ? [result.annotated_image_url] : []);
  const imgsHtml = imgs.length ? `
    <h2 style="margin-top:16px;">Annotated Image${imgs.length > 1 ? 's' : ''}</h2>
    ${imgs.map((u, i) => `
      <div class="img">
        <div class="muted" style="padding:6px 8px; border-bottom:1px solid #E5E7EB;">${i+1}. ${u.split('/').pop() || 'image'}</div>
        <img src="${u}" alt="Annotated ${i+1}" />
      </div>
    `).join('')}
  ` : '';

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>${styles}</style>
    </head>
    <body>
      ${headerHtml}
      ${metricsHtml}
      ${imgsHtml}
      <div class="no-print" style="margin-top:16px;">
        <button onclick="window.print()" style="padding:8px 12px; border:1px solid #E5E7EB; border-radius:6px; background:#111827; color:#fff;">Print</button>
      </div>
      <script>window.addEventListener('load', ()=>{ setTimeout(()=>{ window.print(); }, 200); });</script>
    </body>
  </html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

