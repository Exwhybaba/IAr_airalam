# MalariaAI — How It Works

This document explains the end‑to‑end workflow of the MalariaAI system, including request flow, where data is stored, how metrics are computed (especially parasite density), and how to use batch aggregation and annotated image review.

## Architecture Overview

- Client (React + Vite): Dev server at `http://localhost:3000`.
  - Proxies `/api`, `/uploads`, `/assets` to the Node API (`http://localhost:5000`).
  - Key files:
    - `client/Medical_Wireframe/src/lib/api.ts`
    - `client/Medical_Wireframe/src/components/pages/Upload.tsx`
    - `client/Medical_Wireframe/src/components/pages/ResultDetails.tsx`
- Node API (Express): `http://localhost:5000`
  - Routes:
    - `POST /api/v1/infer` — single image inference
    - `POST /api/v1/infer/batch` — batch inference (supports aggregation)
    - `GET /api/v1/results` — list results
    - `GET /api/v1/results/:id` — result details
    - `GET /api/v1/patients` and `GET /api/v1/patients/:id` — patient views
    - `GET /api/v1/settings` and `POST /api/v1/settings` — system settings (org profile, defaults)
  - Key files:
    - `server/server.js`
    - `server/routes/infer.routes.js`
    - `server/routes/results.routes.js`
    - `server/models/Result.js`
    - `server/store/config.js`
- Python YOLO Service (Flask): `http://localhost:7000`
  - Accepts `POST /api/v1/infer` with an image; returns detections, a summary, and an `annotated_image_url`.
  - Key file:
    - `yolo_service/app.py`

## Data Flow (Single Image)

1. Client sends `multipart/form-data` to `POST /api/v1/infer` with fields:
   - `file`: the image
   - Patient metadata: `patientId`, `patientName`, `age`, `sex`, `sampleType`, `clinician`
   - Optional lab inputs: `rbc_parasitized`, `rbc_total`, `parasite_count`, `wbc_counted`, `wbcs_per_ul`
2. Node forwards the image to the Python YOLO endpoint (`INFER_UPSTREAM_URL`), then receives:
   - `detections[]`, `summary.total`, `summary.by_class`, `summary.avg_confidence`, `annotated_image_url`
3. Node computes lab‑based metrics (see “Parasite Density Calculation”) and merges them into the result `summary`.
4. If MongoDB is connected, a `Result` document is stored. Otherwise, an in‑memory fallback is used.
5. The JSON response includes the merged summary, `annotated_image_url`, and the new result `id` (if saved).

Result schema (subset) — `server/models/Result.js`:

```js
{
  source_filename: String,
  original_image_url: String,
  annotated_image_url: String,
  annotated_images: [String], // when multiple images pertain to a single result (e.g. aggregation)
  detections: [...],
  summary: {
    total, by_class, avg_confidence,
    density_per_megapixel,
    // Lab derived
    density_per_ul, parasitemia_percent, calc_method,
    rbc_parasitized, rbc_total, parasite_count, wbc_counted, wbcs_per_ul,
    severity
  },
  patientId, patientName, age, sex, sampleType, clinician,
  created_at, updated_at
}
```

## Data Flow (Batch)

- Endpoint: `POST /api/v1/infer/batch`
- Form fields:
  - Images: `files` (repeat per file)
  - Per‑file (sent as arrays): `patientIds`, `patientNames`, `ages`, `sexes`, `sampleTypes`, `clinicians`
  - Per‑file lab arrays: `rbc_parasitized`, `rbc_totals`, `parasite_counts`, `wbc_counteds`, `wbcs_per_uls`
  - Flags/options: `aggregateBatch=true` (aggregate all images into a single result)
  - Optional batch‑level lab override when aggregating:
    - `batch_rbc_parasitized`, `batch_rbc_total`, `batch_parasite_count`, `batch_wbc_counted`, `batch_wbcs_per_ul`

Two modes:

1) Non‑aggregate (default):
   - Each image is YOLO‑inferred and saved independently (one Result per image).

2) Aggregate (`aggregateBatch=true`):
   - All images are inferred, then combined into a single aggregated Result (one ID).
   - Aggregation details — `server/routes/infer.routes.js`:
     - Detections: sums `summary.total` across images.
     - `avg_confidence`: mean of per‑image averages.
     - `density_per_megapixel`: total detections / sum of image areas (in MPx).
     - Lab inputs: sums raw counts across images; if batch‑level lab values are provided, they take precedence for computation.
     - Severity: derived from lab density if available, else from summed detections (rule of thumb).
     - `annotated_images`: array of all annotated image URLs; `annotated_image_url` is set to the first for previews.
   - The API returns `aggregate_id` and `batch_aggregate{...}` for immediate UI display.

## Parasite Density Calculation

Node computes and merges lab‑derived metrics in `computeLabMetrics()` — `server/routes/infer.routes.js`:

1. WBC Method (preferred when available)

Counting guidance:
- Count asexual parasites (typically trophozoites) separately; do not include gametocytes in this method.
- Count WBCs separately in the same microscopic fields.

Given:
- `parasite_count` (trophozoites): total trophozoites observed across fields
- `wbc_counted`: total WBCs counted in those same fields
- `wbcs_per_ul`: assumed WBCs per µL (default 8000, configurable; some labs use 6000–7500)

Formula (note the order of the ratio):

```
Parasite density (parasites/µL) = (parasite_count / wbc_counted) × wbcs_per_ul
```

Example:

```
parasite_count = 13 (trophozoites)
wbc_counted    = 150
wbcs_per_ul    = 8000

density_per_ul = (13 / 150) × 8000 = 693 parasites/µL
```

2. RBC Method (parasitemia %)

Given:
- `rbc_parasitized`: parasitized RBC count
- `rbc_total`: total RBCs evaluated (recommend 500–2000)

Formula:

```
parasitemia_percent = (rbc_parasitized / rbc_total) * 100
```

3. YOLO‑Derived Density (when no lab inputs)

The Python service returns:
- `summary.total`: detected parasite‑like objects
- `summary.area_megapixels`: image area in MPx

Formula:

```
density_per_megapixel = total / area_megapixels
```

4. Severity Heuristic

When lab density is available:

```
> 100,000 /µL  => Severe
>= 10,000 /µL  => Moderate
> 0 /µL        => Mild
0              => None
```

Fallback based on raw detections (if no lab counts):

```
total >= 100 => Severe
total >= 20  => Moderate
total > 0    => Low
else         => None
```

These rules are implemented in:
- `server/routes/infer.routes.js` (single/batch merge)
- `server/routes/results.routes.js` (`computeMetrics` for listings and patients)

## Settings (Org profile and defaults)

Settings persist in `server/config/settings.json` via `server/store/config.js` and can also pull from env variables.

User‑facing settings UI (`/settings`) includes:
- Organization profile: `ORG_NAME`, `ORG_EMAIL`, `ORG_PHONE`, `ORG_ADDRESS`, `LOGO_URL` (logo upload at `POST /api/v1/settings/logo`)
- Analysis defaults: `CONF` (YOLO confidence), `WBCS_PER_UL_DEFAULT`
- Notifications toggles (placeholders): `NOTIFY_EMAILS_ENABLED`, `LOW_CONF_ALERTS_ENABLED`

Back‑office/IT:
- `INFER_UPSTREAM_URL` and `INFER_ASSET_BASE` (Python service endpoint and asset base)

Endpoints:
- `GET /api/v1/settings` — returns current settings
- `POST /api/v1/settings` — updates selected fields

## Annotated Image Review

When a result has multiple annotated images (e.g., aggregate batch), the UI shows every annotated image individually (grid with optional lightbox):
- `client/Medical_Wireframe/src/components/pages/ResultDetails.tsx`
  - Grid of `annotated_images[]`
  - Click to open lightbox; keyboard arrows and ESC supported
  - Toggle Grid/Single view; single view includes thumbnails and zoom controls

## Running Locally (Dev)

1. Start YOLO Python service

```
cd yolo_service
python app.py  # ensure ultralytics/flask/cv2 installed
# Visits: http://localhost:7000/health
```

2. Start Node API

```
cd server
npm install
npm run dev
# Visits: http://localhost:5000/health
```

3. Start Client (Vite)

```
cd client/Medical_Wireframe
npm install
npm run dev
# Open http://localhost:3000
```

## API Examples

Single Image

```
curl -X POST http://localhost:5000/api/v1/infer \
  -F "file=@/path/to/image.jpg" \
  -F "patientId=P-251104-ABCD12" \
  -F "patientName=John Doe" \
  -F "age=34" -F "sex=male" -F "sampleType=thick" -F "clinician=Dr Smith" \
  -F "parasite_count=200" -F "wbc_counted=1000" -F "wbcs_per_ul=8000"
```

Batch (Aggregate into single result)

```
curl -X POST http://localhost:5000/api/v1/infer/batch \
  -F "files=@/path/a.jpg" -F "files=@/path/b.jpg" \
  -F "patientIds=P-251104-123456" -F "patientIds=P-251104-123456" \
  -F "patientNames=Jane Roe" -F "patientNames=Jane Roe" \
  -F "aggregateBatch=true" \
  -F "batch_parasite_count=350" -F "batch_wbc_counted=1000" -F "batch_wbcs_per_ul=8000"
```

Response includes `aggregate_id` and `batch_aggregate` (combined metrics), and only one Result is stored/presented for the batch.

## Notes & Recommendations

- If MongoDB is not connected, results are stored in an in‑memory fallback (`server/store/memory.js`) and still appear in the UI.
- Secure `POST /api/v1/settings` and `/api/v1/settings/logo` behind admin auth for production.
- The `CONF`/`IOU` defaults can be set in settings; explicit request query params take precedence.
