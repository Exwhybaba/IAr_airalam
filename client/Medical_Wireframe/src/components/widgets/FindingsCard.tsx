import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";

type SummaryLike = {
  density_per_ul?: number;
  parasitemia_percent?: number;
  calc_method?: string;
  rbc_parasitized?: number;
  rbc_total?: number;
  parasite_count?: number;
  wbc_counted?: number;
  wbcs_per_ul?: number;
  severity?: string;
  avg_confidence?: number;
  total?: number;
  by_class?: Record<string, number> | Map<string, number>;
  counts_by_category?: { trophozoites?: number; wbcs?: number } | Record<string, number> | Map<string, number>;
};

function toNum(v: any, def?: number){
  const n = Number(v);
  return Number.isFinite(n) ? n : (def as any);
}

function entriesOf(obj: any): Array<[string, number]> {
  try{
    if (!obj) return []
    if (typeof obj.entries === 'function'){
      return Array.from(obj.entries()) as Array<[string, number]> // Map
    }
    return Object.entries(obj) as Array<[string, number]>
  }catch{ return [] }
}

function deriveCounts(summary?: SummaryLike){
  const out = { parasites: 0, wbcs: 0 };
  if (!summary) return out;
  // Prefer explicit counts when provided
  const ps = toNum((summary as any).parasite_count);
  const ws = toNum((summary as any).wbc_counted);
  if (Number.isFinite(ps) && ps! > 0) out.parasites = ps!;
  if (Number.isFinite(ws) && ws! > 0) out.wbcs = ws!;
  if (out.parasites > 0 && out.wbcs > 0) return out;
  // Next, prefer batch/category tallies when present
  const cc = (summary as any).counts_by_category as any;
  if (cc && typeof cc === 'object'){
    let t: number | undefined = undefined
    let w: number | undefined = undefined
    try{
      if (typeof cc.get === 'function'){
        t = toNum(cc.get('trophozoites'))
        w = toNum(cc.get('wbcs'))
      } else {
        t = toNum(cc.trophozoites)
        w = toNum(cc.wbcs)
      }
    }catch{}
    if (!out.parasites && Number.isFinite(t) && t! > 0) out.parasites = t!;
    if (!out.wbcs && Number.isFinite(w) && w! > 0) out.wbcs = w!;
  }
  if (out.parasites > 0 && out.wbcs > 0) return out;
  // Finally, derive from class labels heuristically (narrow parasite rules)
  const bc = (summary as any).by_class as any;
  if (bc && typeof bc === 'object'){
    const entries = entriesOf(bc)
    for (const [label, cnt] of entries){
      try{
        const lbl = String(label || '').toLowerCase();
        const n = Number(cnt || 0);
        if (!lbl || !Number.isFinite(n)) continue;
        if (lbl.includes('wbc') || lbl.includes('white blood') || lbl.includes('leukocyte')) out.wbcs += n;
        if (lbl.includes('troph') || lbl.includes('tropho') || lbl.includes('parasite') || lbl.includes('ring')) out.parasites += n;
      }catch{}
    }
    if (out.parasites === 0 && Number.isFinite((summary as any).total) && ((summary as any).total as any) > 0){
      const p = Number((summary as any).total) - out.wbcs;
      if (p > 0) out.parasites = p;
    }
  }
  return out;
}

export default function FindingsCard({
  summary,
  title = 'Findings',
  showConfidence = true,
  showClasses = true,
  severity: severityOverride
}: { summary?: SummaryLike, title?: string, showConfidence?: boolean, showClasses?: boolean, severity?: string }){
  const s = (summary || {}) as SummaryLike;
  const counts = deriveCounts(s);
  const wbcsPerUl = toNum(s.wbcs_per_ul, 8000) || 8000; // assumed 8000 /µL by default
  let density = (typeof s.density_per_ul === 'number' && isFinite(s.density_per_ul))
    ? Number(s.density_per_ul)
    : undefined;
  if (density == null && counts.parasites > 0 && counts.wbcs > 0){
    density = (counts.parasites / counts.wbcs) * wbcsPerUl;
  }
  const severity = severityOverride || (s.severity as any);
  const avgConf = (typeof s.avg_confidence === 'number') ? Number(s.avg_confidence) : undefined;
  const byClassEntries = s.by_class && typeof s.by_class === 'object' ? entriesOf(s.by_class as any) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Counts and WBC-based density</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Parasite Density (per µL)</Label>
              <span className="text-gray-900">{density != null ? `${Math.round(density).toLocaleString()} /µL` : '-'}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Severity</Label>
              <span className="text-gray-900">{severity || '-'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Trophozoites Counted</Label>
              <span className="text-gray-900">{Number.isFinite(counts.parasites) ? String(counts.parasites) : '-'}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>WBCs Counted</Label>
              <span className="text-gray-900">{Number.isFinite(counts.wbcs) ? String(counts.wbcs) : '-'}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Assumed WBCs/µL Used</Label>
              <span className="text-gray-900">{`${Number(wbcsPerUl).toLocaleString()} /µL`}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Parasitemia</Label>
              <span className="text-gray-900">{(typeof s.parasitemia_percent === 'number' && isFinite(Number(s.parasitemia_percent))) ? `${Number(s.parasitemia_percent).toFixed(2)} %` : '-'}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Method</Label>
              <span className="text-gray-900">{s.calc_method || '-'}</span>
            </div>
          </div>
        </div>

        {showConfidence && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Average Confidence</Label>
                <span className="text-gray-900">{avgConf != null ? `${Math.round(100*avgConf)}%` : '-'}</span>
              </div>
            </div>
          </>
        )}

        {showClasses && byClassEntries && byClassEntries.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Top Classes</Label>
              </div>
              <div className="space-y-2">
                {byClassEntries.slice(0,5).map(([label, cnt], i)=> (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-900">{String(label)}</span>
                    <Badge variant="outline">{String(cnt)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
