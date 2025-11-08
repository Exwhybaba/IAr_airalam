import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Upload as UploadIcon, FileImage, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { inferSingle, inferBatch } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import FindingsCard from '../widgets/FindingsCard';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

type UploadItem = {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  progress: number;
};

type BatchPatientMeta = {
  patientId?: string;
  patientName?: string;
  age?: string | number;
  sex?: string;
  sampleType?: string;
  clinician?: string;
  // Lab fields per file (optional)
  rbc_parasitized?: string | number;
  rbc_total?: string | number;
  parasite_count?: string | number;
  wbc_counted?: string | number;
  wbcs_per_ul?: string | number;
};

export default function Upload() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'batch' ? 'batch' : 'single';

  const [activeTab, setActiveTab] = useState<'single' | 'batch'>(defaultTab as 'single' | 'batch');
  const [singleFile, setSingleFile] = useState<UploadItem | null>(null);
  const [batchFiles, setBatchFiles] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Single upload form state
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [clinician, setClinician] = useState('');
  // Single lab inputs
  const [rbcParasitized, setRbcParasitized] = useState('');
  const [rbcTotal, setRbcTotal] = useState('');
  const [parasiteCount, setParasiteCount] = useState('');
  const [wbcCounted, setWbcCounted] = useState('');
  const [wbcsPerUl, setWbcsPerUl] = useState('8000');

  // Autogenerate a unique patient ID by default (server also enforces uniqueness)
  useEffect(() => {
    if (!patientId) {
      const dt = new Date();
      const y = String(dt.getFullYear()).slice(-2);
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      setPatientId(`P-${y}${m}${d}-${rand}`);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, mode: 'single' | 'batch') => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) {
      toast.error('Please upload image files only');
      return;
    }

    if (mode === 'single' && files.length > 0) {
      const file = files[0];
      setSingleFile({
        id: Math.random().toString(36).slice(2, 11),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      });
    } else if (mode === 'batch') {
      const newFiles: UploadItem[] = files.map((file) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      }));
      setBatchFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mode: 'single' | 'batch') => {
    const files = Array.from(e.target.files || []);

    if (mode === 'single' && files.length > 0) {
      const file = files[0];
      setSingleFile({
        id: Math.random().toString(36).slice(2, 11),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      });
    } else if (mode === 'batch') {
      const newFiles: UploadItem[] = files.map((file) => ({
        id: Math.random().toString(36).slice(2, 11),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      }));
      setBatchFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const [result, setResult] = useState<any>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!singleFile) return;
    setSingleFile((prev) => (prev ? { ...prev, status: 'uploading', progress: 0 } : null));
    setResult(null);
    setResultError(null);
    try {
      setSingleFile((prev) => (prev ? { ...prev, progress: 30 } : null));
      const res = await inferSingle(singleFile.file, {
        patientId,
        patientName,
        age,
        sex,
        sampleType,
        clinician,
      }, {
        rbc_parasitized: rbcParasitized,
        rbc_total: rbcTotal,
        parasite_count: parasiteCount,
        wbc_counted: wbcCounted,
        wbcs_per_ul: wbcsPerUl,
      });
      setSingleFile((prev) => (prev ? { ...prev, status: 'success', progress: 100 } : null));
      setResult(res);
      toast.success('Analysis complete!');
    } catch (e: any) {
      setSingleFile((prev) => (prev ? { ...prev, status: 'error', progress: 0 } : null));
      setResultError(e?.message || 'Error analyzing image');
      toast.error('Analysis failed');
    }
  };

  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  // Batch patient metadata state
  const [batchPatientMeta, setBatchPatientMeta] = useState<Record<string, BatchPatientMeta>>({});
  const [aggregateBatch, setAggregateBatch] = useState(false);
  // Batch-level single patient info when aggregate is on
  const [bpPatientId, setBpPatientId] = useState('');
  const [bpPatientName, setBpPatientName] = useState('');
  const [bpAge, setBpAge] = useState('');
  const [bpSex, setBpSex] = useState('');
  const [bpSampleType, setBpSampleType] = useState('');
  const [bpClinician, setBpClinician] = useState('');
  // Batch-level lab inputs when aggregate is on
  const [bpRbcParasitized, setBpRbcParasitized] = useState('');
  const [bpRbcTotal, setBpRbcTotal] = useState('');
  const [bpParasiteCount, setBpParasiteCount] = useState('');
  const [bpWbcCounted, setBpWbcCounted] = useState('');
  const [bpWbcsPerUl, setBpWbcsPerUl] = useState('');

  useEffect(()=>{
    if (aggregateBatch && !bpPatientId){
      const dt = new Date();
      const y = String(dt.getFullYear()).slice(-2);
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      setBpPatientId(`P-${y}${m}${d}-${rand}`);
    }
  }, [aggregateBatch, bpPatientId])

  const handleBatchMetaChange = (fileId: string, field: keyof BatchPatientMeta, value: string) => {
    setBatchPatientMeta((prev) => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [field]: value,
      },
    }));
  };

  const handleBatchAnalyze = async () => {
    if (batchFiles.length === 0) return;
    setBatchFiles((prev) => prev.map((f) => ({ ...f, status: 'uploading', progress: 0 })));
    setBatchResult(null);
    setBatchError(null);
    try {
      setBatchFiles((prev) => prev.map((f) => ({ ...f, progress: 30 })));
      const patients = aggregateBatch
        ? batchFiles.map(() => ({ patientId: bpPatientId, patientName: bpPatientName, age: bpAge, sex: bpSex, sampleType: bpSampleType, clinician: bpClinician }))
        : batchFiles.map((f) => batchPatientMeta[f.id] || { patientId: '', patientName: '' });
      const res = await inferBatch(
        batchFiles.map((f) => f.file),
        patients.map((p) => ({
          patientId: p.patientId || '',
          patientName: p.patientName || '',
          age: p.age,
          sex: p.sex,
          sampleType: p.sampleType,
          clinician: p.clinician,
        })),
        {
          rbc_parasitized: aggregateBatch ? batchFiles.map(()=> bpRbcParasitized) : batchFiles.map((f)=> (batchPatientMeta[f.id]?.rbc_parasitized ?? '')),
          rbc_totals: aggregateBatch ? batchFiles.map(()=> bpRbcTotal) : batchFiles.map((f)=> (batchPatientMeta[f.id]?.rbc_total ?? '')),
          parasite_counts: aggregateBatch ? batchFiles.map(()=> bpParasiteCount) : batchFiles.map((f)=> (batchPatientMeta[f.id]?.parasite_count ?? '')),
          wbc_counteds: aggregateBatch ? batchFiles.map(()=> bpWbcCounted) : batchFiles.map((f)=> (batchPatientMeta[f.id]?.wbc_counted ?? '')),
          wbcs_per_uls: aggregateBatch ? batchFiles.map(()=> bpWbcsPerUl) : batchFiles.map((f)=> (batchPatientMeta[f.id]?.wbcs_per_ul ?? '')),
        },
        { aggregateBatch, batchLab: aggregateBatch ? { rbc_parasitized: bpRbcParasitized, rbc_total: bpRbcTotal, parasite_count: bpParasiteCount, wbc_counted: bpWbcCounted, wbcs_per_ul: bpWbcsPerUl } : undefined }
      );
      setBatchFiles((prev) => prev.map((f) => ({ ...f, status: 'success', progress: 100 })));
      setBatchResult(res);
      toast.success('Batch analysis complete!');
    } catch (e: any) {
      setBatchFiles((prev) => prev.map((f) => ({ ...f, status: 'error', progress: 0 })));
      setBatchError(e?.message || 'Batch analysis failed');
      toast.error('Batch analysis failed');
    }
  };

  const removeFile = (id: string) => {
    setBatchFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Upload & Analyze</h1>
          <p className="text-gray-600">Upload single image or batch for analysis</p>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'batch')}>
        <TabsList>
          <TabsTrigger value="single">Single</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Single Upload</CardTitle>
              <CardDescription>Upload one image and add patient metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'single')}
                className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 ${
                  isDragging ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                }`}
              >
                <UploadIcon className="w-6 h-6 text-gray-500" />
                <p className="text-sm text-gray-600">Drag and drop an image here</p>
                <div>
                  <Label htmlFor="single-file" className="sr-only">
                    Select file
                  </Label>
                  <Input id="single-file" type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 'single')} />
                </div>
              </div>

              {singleFile && (
                <div className="flex items-center gap-4">
                  <img src={singleFile.preview} alt="preview" className="w-24 h-24 object-cover rounded" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {singleFile.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : singleFile.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <FileImage className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm text-gray-700">{singleFile.file.name}</span>
                    </div>
                    <Progress value={singleFile.progress} className="mt-2" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patientId">Patient ID</Label>
                  <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input id="patientName" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sex">Sex</Label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sampleType">Sample Type</Label>
                  <Input id="sampleType" value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="clinician">Clinician</Label>
                  <Input id="clinician" value={clinician} onChange={(e) => setClinician(e.target.value)} />
                </div>
              </div>

              {/* Lab inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between font-medium text-sm text-gray-700 mb-2">
                    <span>RBC Method</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="About RBC method" className="text-gray-500 hover:text-gray-700">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Count parasitized and total RBCs across fields (recommend 500–2000).
                        Parasitemia % = (parasitized / total) × 100.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="rbcParasitized">Parasitized RBCs</Label>
                      <Input id="rbcParasitized" value={rbcParasitized} onChange={(e)=>setRbcParasitized(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="rbcTotal">Total RBCs (500–2000)</Label>
                      <Input id="rbcTotal" value={rbcTotal} onChange={(e)=>setRbcTotal(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between font-medium text-sm text-gray-700 mb-2">
                    <span>WBC Method</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="About WBC method" className="text-gray-500 hover:text-gray-700">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Count trophozoites (asexual) and WBCs in the same fields.
                        Density/µL = (parasites / WBCs) × assumed WBCs/µL (default 8000).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="parasiteCount">Parasites (trophozoites)</Label>
                      <Input id="parasiteCount" value={parasiteCount} onChange={(e)=>setParasiteCount(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="wbcCounted">WBCs Counted</Label>
                      <Input id="wbcCounted" value={wbcCounted} onChange={(e)=>setWbcCounted(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="wbcsPerUl">WBCs per µL</Label>
                      <Input id="wbcsPerUl" value={wbcsPerUl} onChange={(e)=>setWbcsPerUl(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAnalyze} disabled={!singleFile || singleFile.status === 'uploading'}>
                  Analyze
                </Button>
                {result && <Badge variant="outline">Done</Badge>}
                {resultError && (
                  <span className="text-sm text-red-600" role="alert">
                    {resultError}
                  </span>
                )}
              </div>

              {result && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Result</CardTitle>
                    <CardDescription>Annotated image and summary</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.annotated_image_url ? (
                      <img
                        src={result.annotated_image_url}
                        alt="Annotated"
                        className="w-full max-h-[480px] object-contain rounded border"
                      />
                    ) : (
                      <div className="p-4 border rounded text-sm text-gray-600">
                        No annotated image returned. Showing original preview.
                        {singleFile?.preview && (
                          <img
                            src={singleFile.preview}
                            alt="Original"
                            className="mt-2 w-full max-h-[480px] object-contain rounded border"
                          />
                        )}
                      </div>
                    )}
                    {result.summary && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500">Patient ID</div>
                            {result?.id ? (
                              <Link to={`/results/${result.id}`} className="text-red-600 hover:underline">
                                {result?.patientId || patientId || '-'}
                              </Link>
                            ) : (
                              <span className="text-gray-900">{result?.patientId || patientId || '-'}</span>
                            )}
                          </div>
                        </div>
                        <FindingsCard summary={result.summary} severity={result.summary?.severity} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Batch Upload</CardTitle>
              <CardDescription>Upload multiple images with optional metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'batch')}
                className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 ${
                  isDragging ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                }`}
              >
                <UploadIcon className="w-6 h-6 text-gray-500" />
                <p className="text-sm text-gray-600">Drag and drop images here</p>
                <div>
                  <Label htmlFor="batch-files" className="sr-only">
                    Select files
                  </Label>
                  <Input id="batch-files" type="file" accept="image/*" multiple onChange={(e) => handleFileSelect(e, 'batch')} />
                </div>
              </div>

              {batchFiles.length > 0 && (
                <div className="space-y-3">
                  {batchFiles.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 border rounded p-2">
                      <img src={f.preview} alt="preview" className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{f.file.name}</span>
                          </div>
                          <button onClick={() => removeFile(f.id)} className="text-gray-500 hover:text-gray-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {!aggregateBatch && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                          <Input
                            placeholder="Patient ID"
                            value={batchPatientMeta[f.id]?.patientId || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'patientId', e.target.value)}
                          />
                          <Input
                            placeholder="Patient Name"
                            value={batchPatientMeta[f.id]?.patientName || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'patientName', e.target.value)}
                          />
                          <Input
                            placeholder="Age"
                            value={batchPatientMeta[f.id]?.age?.toString() || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'age', e.target.value)}
                          />
                          <Input
                            placeholder="Sex"
                            value={batchPatientMeta[f.id]?.sex || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'sex', e.target.value)}
                          />
                          <Input
                            placeholder="Sample Type"
                            value={batchPatientMeta[f.id]?.sampleType || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'sampleType', e.target.value)}
                          />
                          <Input
                            placeholder="Clinician"
                            value={batchPatientMeta[f.id]?.clinician || ''}
                            onChange={(e) => handleBatchMetaChange(f.id, 'clinician', e.target.value)}
                          />
                        </div>
                        )}
                        {!aggregateBatch && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <div className="p-2 border rounded">
                          <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                            <span>RBC Method</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" aria-label="About RBC method" className="text-gray-500 hover:text-gray-700">
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Count parasitized and total RBCs across fields.
                                Parasitemia % = (parasitized / total) × 100.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <Input placeholder="Parasitized RBCs" value={batchPatientMeta[f.id]?.rbc_parasitized?.toString() || ''} onChange={(e)=>handleBatchMetaChange(f.id, 'rbc_parasitized', e.target.value)} />
                              <Input placeholder="Total RBCs (500–2000)" value={batchPatientMeta[f.id]?.rbc_total?.toString() || ''} onChange={(e)=>handleBatchMetaChange(f.id, 'rbc_total', e.target.value)} />
                            </div>
                          </div>
                        <div className="p-2 border rounded">
                          <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                            <span>WBC Method</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" aria-label="About WBC method" className="text-gray-500 hover:text-gray-700">
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Count trophozoites (asexual) and WBCs in the same fields.
                                Density/µL = (parasites / WBCs) × assumed WBCs/µL.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                              <Input placeholder="Parasites (trophozoites)" value={batchPatientMeta[f.id]?.parasite_count?.toString() || ''} onChange={(e)=>handleBatchMetaChange(f.id, 'parasite_count', e.target.value)} />
                              <Input placeholder="WBCs Counted" value={batchPatientMeta[f.id]?.wbc_counted?.toString() || ''} onChange={(e)=>handleBatchMetaChange(f.id, 'wbc_counted', e.target.value)} />
                              <Input placeholder="WBCs per µL" value={batchPatientMeta[f.id]?.wbcs_per_ul?.toString() || ''} onChange={(e)=>handleBatchMetaChange(f.id, 'wbcs_per_ul', e.target.value)} />
                            </div>
                          </div>
                        </div>
                        )}
                        <Progress value={f.progress} className="mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleBatchAnalyze} disabled={batchFiles.length === 0 || batchFiles.some((f) => f.status === 'uploading')}>
                  Analyze Batch
                </Button>
                {batchResult && <Badge variant="outline">Done</Badge>}
                {batchError && (
                  <span className="text-sm text-red-600" role="alert">
                    {batchError}
                  </span>
                )}
              </div>

              {(!aggregateBatch && batchResult?.items?.length > 0) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batchResult.items.map((it: any, idx: number) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">Item {idx + 1}</CardTitle>
                        <CardDescription>Status: {it.status}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {it.status !== 'done' && (
                          <div className="text-sm text-red-600">{it.error || 'Failed'}</div>
                        )}
                        {it.status === 'done' && (
                          <>
                            {it.result?.annotated_image_url && (
                              <img
                                src={it.result.annotated_image_url}
                                alt={`Annotated ${idx + 1}`}
                                className="w-full max-h-[300px] object-contain rounded border"
                              />
                            )}
                            {it.result?.summary && (
                              <div className="space-y-2">
                                <FindingsCard summary={it.result.summary} severity={it.result.summary?.severity} />
                                {it.id && (
                                  <div className="pt-1">
                                    <Link to={`/results/${it.id}`} className="text-red-600 hover:underline text-sm">
                                      View result
                                    </Link>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-6 flex items-center gap-2">
                <input id="aggregate-batch" type="checkbox" checked={aggregateBatch} onChange={(e)=>setAggregateBatch(e.target.checked)} />
                <Label htmlFor="aggregate-batch">Aggregate all images together and compute batch metrics</Label>
              </div>
              {aggregateBatch && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Patient ID</Label>
                      <Input value={bpPatientId} onChange={(e)=>setBpPatientId(e.target.value)} />
                    </div>
                    <div>
                      <Label>Patient Name</Label>
                      <Input value={bpPatientName} onChange={(e)=>setBpPatientName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input value={bpAge} onChange={(e)=>setBpAge(e.target.value)} />
                    </div>
                    <div>
                      <Label>Sex</Label>
                      <Select value={bpSex} onValueChange={setBpSex}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sample Type</Label>
                      <Input value={bpSampleType} onChange={(e)=>setBpSampleType(e.target.value)} />
                    </div>
                    <div>
                      <Label>Clinician</Label>
                      <Input value={bpClinician} onChange={(e)=>setBpClinician(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <div className="flex items-center justify-between font-medium text-sm text-gray-700 mb-2">
                        <span>RBC Method</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="About RBC method" className="text-gray-500 hover:text-gray-700">
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Count parasitized and total RBCs across fields (recommend 500–2000).
                            Parasitemia % = (parasitized / total) × 100.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Parasitized RBCs</Label>
                          <Input value={bpRbcParasitized} onChange={(e)=>setBpRbcParasitized(e.target.value)} />
                        </div>
                        <div>
                          <Label>Total RBCs (500–2000)</Label>
                          <Input value={bpRbcTotal} onChange={(e)=>setBpRbcTotal(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="flex items-center justify-between font-medium text-sm text-gray-700 mb-2">
                        <span>WBC Method</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="About WBC method" className="text-gray-500 hover:text-gray-700">
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Count trophozoites (asexual) and WBCs in the same fields.
                            Density/µL = (parasites / WBCs) × assumed WBCs/µL.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                      <Label>Parasites (trophozoites)</Label>
                          <Input value={bpParasiteCount} onChange={(e)=>setBpParasiteCount(e.target.value)} />
                        </div>
                        <div>
                          <Label>WBCs Counted</Label>
                          <Input value={bpWbcCounted} onChange={(e)=>setBpWbcCounted(e.target.value)} />
                        </div>
                        <div>
                          <Label>WBCs per µL</Label>
                          <Input value={bpWbcsPerUl} onChange={(e)=>setBpWbcsPerUl(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {batchResult?.batch_aggregate && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Batch Aggregate</CardTitle>
                    <CardDescription>Combined metrics across all images</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FindingsCard summary={batchResult.batch_aggregate} severity={batchResult.batch_aggregate?.severity} />
                    <div className="mt-3 text-sm text-gray-700 flex flex-wrap gap-4">
                      <span>Result ID: {batchResult.aggregate_id ?? '-'}</span>
                      <span>Total detections: {batchResult.batch_aggregate.detections_total ?? '-'}</span>
                      <span>Density/MPx: {batchResult.batch_aggregate.density_per_megapixel != null ? Number(batchResult.batch_aggregate.density_per_megapixel).toFixed(2) : '-'}</span>
                      <span>Avg confidence: {batchResult.batch_aggregate.avg_confidence != null ? (Math.round(100*Number(batchResult.batch_aggregate.avg_confidence)))+'%' : '-'}</span>
                    </div>
                    {batchResult.aggregate_id && (
                      <div className="pt-2 flex items-center gap-3">
                        <Link to={`/results/${batchResult.aggregate_id}`} className="text-red-600 hover:underline">
                          View aggregated result
                        </Link>
                        <button
                          type="button"
                          className="text-sm text-gray-700 hover:text-gray-900 underline"
                          onClick={() => navigator.clipboard?.writeText(String(batchResult.aggregate_id)).then(()=>toast.success('Result ID copied'))}
                        >
                          Copy ID
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {batchResult?.aggregates && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Per-Patient Aggregates</CardTitle>
                    <CardDescription>Summaries across all images per patient</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(batchResult.aggregates).map(([pid, a]: any, i: number) => (
                      <div key={i} className="p-3 border rounded text-sm text-gray-700 flex flex-wrap gap-4">
                        <span className="font-medium text-gray-900">{pid}</span>
                        <span>Density: {a?.density_per_ul != null ? `${Math.round(a.density_per_ul)} /µL` : '-'}</span>
                        <span>Parasitemia: {a?.parasitemia_percent != null ? `${Number(a.parasitemia_percent).toFixed(2)} %` : '-'}</span>
                        <span>Method: {a?.calc_method || '-'}</span>
                        <span>Severity: {a?.severity || '-'}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </TooltipProvider>
    </div>
  );
}

