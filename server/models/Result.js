import mongoose from 'mongoose'

const BBoxSchema = new mongoose.Schema({ x: Number, y: Number, w: Number, h: Number }, { _id: false })
const DetectionSchema = new mongoose.Schema({ class_id: Number, label: String, score: Number, bbox: BBoxSchema }, { _id: false })
const SummarySchema = new mongoose.Schema({
  total: Number,
  by_class: { type: Map, of: Number },
  // Optional category counts returned by the upstream model to aid persistence/debugging
  counts_by_category: { type: Map, of: Number }, // e.g., { trophozoites: N, wbcs: M }
  trophozoites_count: Number,
  wbcs_count: Number,
  severity: String,
  rationale: String,
  // YOLO-derived fields
  image_width: Number,
  image_height: Number,
  area_megapixels: Number,
  density_per_megapixel: Number,
  avg_confidence: Number, // 0..1
  // Lab-calculated metrics
  density_per_ul: Number, // parasites/µL
  parasitemia_percent: Number, // RBC method
  calc_method: String, // 'wbc' | 'rbc' | 'none'
  // Optional raw counts for traceability
  rbc_parasitized: Number,
  rbc_total: Number,
  parasite_count: Number,
  wbc_counted: Number,
  wbcs_per_ul: { type: Number, default: 8000 }
}, { _id: false })

const ResultSchema = new mongoose.Schema({
  source_filename: String,
  original_image_url: String,
  mime_type: String,
  file_size: Number,
  annotated_image_url: String,
  // Optional list of all annotated images associated with this result
  annotated_images: [String],
  detections: [DetectionSchema],
  summary: SummarySchema,
  model_version: { type: String, default: 'yolo-best' },
  thresholds: { conf: Number, iou: Number },
  // Patient metadata fields
  patientId: String,
  patientName: String,
  age: Number,
  sex: String,
  sampleType: String,
  clinician: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

export default mongoose.model('Result', ResultSchema)
