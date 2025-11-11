import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Download, Share2, ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Progress } from '../ui/progress'
import FindingsCard from '../widgets/FindingsCard'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { getResult, getSettings } from '../../lib/api'
import { openPrintWindowForResult } from '../../lib/export'

export default function ResultDetails(){
  const { id } = useParams()
  const [showOverlay, setShowOverlay] = useState(true)
  const [overlayType, setOverlayType] = useState<'boxes'|'heatmap'>('boxes')
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [org, setOrg] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'single'|'grid'>('single')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  
  const filenameFromUrl = (u?: string) => {
    if (!u) return ''
    try{ const url = new URL(u, window.location.origin); return url.pathname.split('/').pop() || u }
    catch{ return (u.split('?')[0] || '').split('/').pop() || u }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getResult(id)
      .then(r => {
        setResult(r)
        const hasMany = Array.isArray(r?.annotated_images) && r.annotated_images.length > 1
        setViewMode(hasMany ? 'grid' : 'single')
        setSelectedIndex(0)
      })
      .catch(()=>setResult(null))
      .finally(()=>setLoading(false))
  }, [id])

  useEffect(()=>{
    getSettings().then(({ settings })=> setOrg(settings)).catch(()=>{})
  },[])

  // Auto-export to print/PDF when query contains export=pdf or autoPrint=1
  useEffect(()=>{
    if (!result) return
    try{
      const sp = new URLSearchParams(window.location.search)
      const shouldPrint = sp.get('export') === 'pdf' || sp.get('autoPrint') === '1'
      if (shouldPrint){
        // Defer to ensure org is fetched
        setTimeout(()=> openPrintWindowForResult(result, org), 50)
      }
    }catch{/* ignore */}
  }, [result, org])

  // Keyboard navigation for lightbox
  useEffect(()=>{
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (!Array.isArray(result?.annotated_images)) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setSelectedIndex(i => (i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setSelectedIndex(i => (i < (result.annotated_images.length - 1) ? i + 1 : i))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, result?.annotated_images])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/results">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              {org?.LOGO_URL ? (<img src={org.LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" />) : null}
              <h1 className="text-gray-900">{org?.ORG_NAME || 'Result Details'}</h1>
            </div>
            <div className="text-gray-600 flex items-center gap-3">
              <span>{result?.id || id} - {result?.patientName || '-'}</span>
              <button
                type="button"
                className="text-sm underline"
                onClick={() => navigator.clipboard?.writeText(String(result?.id || id)).then(()=>{/* no-op */})}
              >
                Copy ID
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={() => openPrintWindowForResult(result, org)}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Patient ID</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/patients/${result?.patientId || ''}`} className="text-red-600 hover:text-red-700">{result?.patientId || '-'}</Link>
            <p className="text-sm text-gray-600 mt-1">{result?.age ?? '-'} years, {result?.sex || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Sample Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-900">{result?.sampleType || '-'}</p>
            <p className="text-sm text-gray-600 mt-1">{result?.collectionDate ? `Collected ${new Date(result.collectionDate).toLocaleDateString()}` : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Analysis Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mb-2">{result?.status || 'Completed'}</Badge>
            <p className="text-sm text-gray-600">{result?.analysisDate ? new Date(result.analysisDate).toLocaleString() : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">QC Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mb-2">{result?.qcStatus || 'Approved'}</Badge>
            <p className="text-sm text-gray-600">By {result?.analyst || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="findings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="image">Image Review</TabsTrigger>
          <TabsTrigger value="quality">Quality Checks</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FindingsCard summary={result?.summary} severity={result?.severity || result?.summary?.severity} />
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Image Analysis</CardTitle>
                  <CardDescription>Blood smear with detection overlay</CardDescription>
                </div>
                {(viewMode === 'single') && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowOverlay(!showOverlay)}>
                      {showOverlay ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                      {showOverlay ? 'Hide' : 'Show'} Overlay
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 25))}><ZoomOut className="w-4 h-4" /></Button>
                    <span className="text-sm text-gray-600 min-w-[50px] text-center">{zoom}%</span>
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}><ZoomIn className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon"><Maximize2 className="w-4 h-4" /></Button>
                  </div>
                )}
                {(Array.isArray(result?.annotated_images) && result.annotated_images.length > 1) && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={()=> setViewMode(viewMode === 'grid' ? 'single' : 'grid')}>
                      {viewMode === 'grid' ? 'Single View' : 'Grid View'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {Array.isArray(result?.annotated_images) && result.annotated_images.length > 1 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.annotated_images.map((u: string, i: number) => (
                      <div key={i} className="relative bg-gray-100 rounded-lg overflow-hidden group">
                        <img
                          src={u}
                          alt={`Annotated ${i+1}`}
                          className="w-full h-auto max-h-[480px] object-contain cursor-pointer"
                          onClick={()=>{ setSelectedIndex(i); setLightboxOpen(true) }}
                        />
                        <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-700">
                          <span className="truncate" title={filenameFromUrl(u)}>Image {i+1} · {filenameFromUrl(u)}</span>
                          <a
                            href={u}
                            download
                            className="opacity-0 group-hover:opacity-100 transition-opacity underline"
                            onClick={(e)=> e.stopPropagation()}
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
                      <div className="relative w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
                        <img src={result.annotated_images[selectedIndex]} alt={`Annotated ${selectedIndex+1}`} className="w-full h-auto max-h-[720px] object-contain" />
                      </div>
                    </div>
                    {/* Thumbnails */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {result.annotated_images.map((u: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          className={`border rounded overflow-hidden ${selectedIndex === i ? 'ring-2 ring-red-500' : ''}`}
                          onClick={()=>setSelectedIndex(i)}
                        >
                          <img src={u} alt={`Annotated ${i+1}`} className="w-full h-20 object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
                  <div className="relative w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
                    {result?.annotated_image_url ? (
                      <img src={result.annotated_image_url} alt="Annotated" className="w-full h-auto max-h-[720px] object-contain" />
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <p className="text-gray-600">Blood Smear Image</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lightbox for grid images */}
              {lightboxOpen && Array.isArray(result?.annotated_images) && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
                  <button className="absolute top-4 right-4 text-white" onClick={()=>setLightboxOpen(false)}>
                    <X className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-4 w-full max-w-5xl px-4">
                    <button className="text-white" onClick={()=> setSelectedIndex((i)=> (i>0 ? i-1 : i))}>
                      <ArrowLeft className="w-8 h-8" />
                    </button>
                    <div className="relative">
                      <img src={result.annotated_images[selectedIndex]} alt={`Annotated ${selectedIndex+1}`} className="max-h-[80vh] w-auto object-contain rounded" />
                      <div className="absolute left-0 right-0 -bottom-10 text-white text-xs flex items-center justify-between">
                        <span className="truncate" title={filenameFromUrl(result.annotated_images[selectedIndex])}>{filenameFromUrl(result.annotated_images[selectedIndex])}</span>
                        <a href={result.annotated_images[selectedIndex]} download className="underline">Download</a>
                      </div>
                    </div>
                    <button className="text-white" onClick={()=> setSelectedIndex((i)=> (i < result.annotated_images.length-1 ? i+1 : i))}>
                      <ArrowRight className="w-8 h-8" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Quality Assessment</CardTitle>
              <CardDescription>Automated checks (placeholder)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Average Confidence</Label>
                    <span className="text-gray-900">{result?.confidence ?? 0}%</span>
                  </div>
                  <Progress value={result?.confidence ?? 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Basic timestamps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div>Created: {result?.created_at ? new Date(result.created_at).toLocaleString() : '-'}</div>
                <div>Updated: {result?.updated_at ? new Date(result.updated_at).toLocaleString() : '-'}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
