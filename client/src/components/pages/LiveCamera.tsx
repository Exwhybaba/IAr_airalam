import { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, Maximize, Grid3x3, Zap, Sun, Droplets, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { inferBatch } from '../../lib/api';
import { Link } from 'react-router-dom';
import FindingsCard from '../widgets/FindingsCard';

interface CapturedFrame {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

export default function LiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [autoCapture, setAutoCapture] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [exposure, setExposure] = useState([50]);
  const [zoom, setZoom] = useState([1]);
  const [whiteBalance, setWhiteBalance] = useState('auto');
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  
  // Patient metadata
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [clinician, setClinician] = useState('');
  const [aggregate, setAggregate] = useState(true);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraActive(true);
      setCameraPermission('granted');
      toast.success('Camera started successfully');
    } catch (error) {
      setCameraPermission('denied');
      toast.error('Camera access denied. Please grant permission.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    toast.success('Camera stopped');
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      
      const newFrame: CapturedFrame = {
        id: Math.random().toString(36).substr(2, 9),
        dataUrl,
        timestamp: new Date(),
      };
      
      setCapturedFrames(prev => [...prev, newFrame]);
      toast.success('Frame captured');
    }
  };

  const deleteFrame = (id: string) => {
    setCapturedFrames(prev => prev.filter(f => f.id !== id));
  };

  const handleAnalyze = async () => {
    try{
      if (capturedFrames.length === 0) {
        toast.error('Please capture at least one frame');
        return;
      }
      if (!patientId || !patientName || !sampleType) {
        toast.error('Please fill in patient information');
        return;
      }
      setAnalyzeError(null)
      setAnalyzeResult(null)
      const files: File[] = []
      for (const f of capturedFrames){
        const resp = await fetch(f.dataUrl)
        const blob = await resp.blob()
        files.push(new File([blob], `frame-${f.id}.png`, { type: blob.type || 'image/png' }))
      }
      const patients = files.map(()=> ({ patientId, patientName, age, sex, sampleType, clinician }))
      const res = await inferBatch(files, patients, undefined, { aggregateBatch: aggregate })
      setAnalyzeResult(res)
      toast.success('Analysis complete')
    }catch(e:any){
      setAnalyzeError(e?.message || 'Failed to analyze')
      toast.error('Analysis failed')
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Live Camera</h1>
        <p className="text-gray-600">Capture images from digital microscope camera</p>
      </div>

      {cameraPermission === 'denied' && (
        <Alert variant="destructive">
          <AlertDescription>
            Camera permission denied. Please grant camera access in your browser settings and refresh the page.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>Digital microscope feed</CardDescription>
                </div>
                <Badge variant={cameraActive ? 'default' : 'secondary'} className={cameraActive ? 'bg-red-600' : ''}>
                  {cameraActive ? 'LIVE' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {showGrid && cameraActive && (
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>
                )}

                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera className="w-16 h-16 mx-auto mb-4" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!cameraActive ? (
                  <Button onClick={startCamera} className="bg-red-600 hover:bg-red-700">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button onClick={stopCamera} variant="destructive">
                      <StopCircle className="w-4 h-4 mr-2" />
                      Stop Camera
                    </Button>
                    <Button onClick={captureFrame}>
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </Button>
                  </>
                )}
                <Button variant="outline" size="icon" disabled={!cameraActive}>
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Camera Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Camera Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-600" />
                  <Label>Auto-Capture</Label>
                </div>
                <Switch
                  checked={autoCapture}
                  onCheckedChange={setAutoCapture}
                  disabled={!cameraActive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-gray-600" />
                  <Label>Grid Overlay</Label>
                </div>
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  disabled={!cameraActive}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-gray-600" />
                  <Label>Exposure: {exposure[0]}%</Label>
                </div>
                <Slider
                  value={exposure}
                  onValueChange={setExposure}
                  max={100}
                  step={1}
                  disabled={!cameraActive}
                />
              </div>

              <div className="space-y-2">
                <Label>Zoom: {zoom[0]}x</Label>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  min={1}
                  max={5}
                  step={0.1}
                  disabled={!cameraActive}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-gray-600" />
                  <Label>White Balance</Label>
                </div>
                <Select value={whiteBalance} onValueChange={setWhiteBalance} disabled={!cameraActive}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="daylight">Daylight</SelectItem>
                    <SelectItem value="cloudy">Cloudy</SelectItem>
                    <SelectItem value="fluorescent">Fluorescent</SelectItem>
                    <SelectItem value="incandescent">Incandescent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Info & Captured Frames */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="camera-patient-id">Patient ID *</Label>
                <Input
                  id="camera-patient-id"
                  placeholder="P-1234"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="camera-patient-name">Patient Name *</Label>
                <Input
                  id="camera-patient-name"
                  placeholder="John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="camera-age">Age</Label>
                <Input id="camera-age" placeholder="e.g., 34" value={age} onChange={(e)=>setAge(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="camera-sex">Sex</Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger id="camera-sex" className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="camera-sample-type">Sample Type *</Label>
                <Select value={sampleType} onValueChange={setSampleType}>
                  <SelectTrigger id="camera-sample-type" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thin">Thin Smear</SelectItem>
                    <SelectItem value="thick">Thick Smear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="camera-clinician">Clinician</Label>
                <Input id="camera-clinician" value={clinician} onChange={(e)=>setClinician(e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input id="aggregate-frames" type="checkbox" checked={aggregate} onChange={(e)=>setAggregate(e.target.checked)} />
                <Label htmlFor="aggregate-frames">Aggregate captured frames into single result</Label>
              </div>
              
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Captured Frames</CardTitle>
                  <CardDescription>{capturedFrames.length} frame(s)</CardDescription>
                </div>
                {capturedFrames.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCapturedFrames([])}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {capturedFrames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No frames captured yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {capturedFrames.map((frame) => (
                    <div key={frame.id} className="relative group">
                      <img
                        src={frame.dataUrl}
                        alt={`Frame ${frame.id}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteFrame(frame.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {frame.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {capturedFrames.length > 0 && (
                <Button
                  onClick={handleAnalyze}
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                >
                  Analyze Captured ({capturedFrames.length})
                </Button>
              )}
              {analyzeError && (
                <div className="text-sm text-red-600 mt-3">{analyzeError}</div>
              )}
              {analyzeResult?.batch_aggregate && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Batch Aggregate</CardTitle>
                    <CardDescription>Combined metrics for captured frames</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FindingsCard summary={analyzeResult.batch_aggregate} severity={analyzeResult.batch_aggregate?.severity} />
                    <div className="mt-3 text-sm text-gray-700 flex flex-wrap gap-4">
                      <span>Result ID: {analyzeResult.aggregate_id ?? '-'}</span>
                      <span>Total detections: {analyzeResult.batch_aggregate.detections_total ?? '-'}</span>
                      <span>Density/MPx: {analyzeResult.batch_aggregate.density_per_megapixel != null ? Number(analyzeResult.batch_aggregate.density_per_megapixel).toFixed(2) : '-'}</span>
                      <span>Avg confidence: {analyzeResult.batch_aggregate.avg_confidence != null ? (Math.round(100*Number(analyzeResult.batch_aggregate.avg_confidence)))+'%' : '-'}</span>
                    </div>
                    {analyzeResult.aggregate_id && (
                      <div className="pt-2 flex items-center gap-3">
                        <Link to={`/results/${analyzeResult.aggregate_id}`} className="text-red-600 hover:underline">
                          View aggregated result
                        </Link>
                        <button
                          type="button"
                          className="text-sm text-gray-700 hover:text-gray-900 underline"
                          onClick={() => navigator.clipboard?.writeText(String(analyzeResult.aggregate_id)).then(()=>toast.success('Result ID copied'))}
                        >
                          Copy ID
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
