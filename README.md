MalariaAI — FastAPI + React Full-Stack for Malaria Parasite Detection

Overview

- Python Inference (FastAPI): loads YOLO model, exposes REST and WebSocket endpoints, streams detections, generates annotated images, reports severity.
- Node API (Express + Mongoose): MERN gateway that receives uploads, calls the Python service, persists results in MongoDB (viewable in Compass), and serves Results to the UI.
- Frontend: Vite + React + Tailwind UI for single/batch uploads and live capture with overlay.
- MLOps: Dockerfiles, docker-compose, env config, GitHub Actions CI skeleton, Prometheus metrics.

Quick Start

1. Backend (local)

- Create and fill `backend/.env` (copy from `backend/.env.example`).
- Optional: put your model at `models/best.pt` or update `MALARIAAI_MODEL_PATH`.
- Create venv, install deps: `pip install -r backend/requirements.txt`.
- Run: `uvicorn app.main:app --reload --app-dir backend/app`.
- Open docs: http://localhost:8000/docs

2. Node API (local)

- `cd server && npm install`
- Create `server/.env` from `server/.env.example` (ensure `MONGO_URI` and `PY_BACKEND_BASE` correct)
- `npm run dev` (Node API at http://localhost:8080)

3. Frontend (local)

- From `frontend/`, run `npm install` then `npm run dev`.
- Configure API base via `VITE_API_BASE` and `VITE_WS_BASE` in `.env` (defaults: Node API 8080, Python WS 8000).

4. Docker Compose

- `cp backend/.env.example backend/.env` and adjust as needed.
- `docker-compose up --build`.
- Backend: http://localhost:8000, Frontend: http://localhost:5173

4. One-command Dev via npm

- In repo root: `npm run dev` (starts backend + frontend)
- Stop both: `npm run stop`
- Start only backend: `npm run dev:backend` (or `cd backend && npm run dev`)
- Start only frontend: `npm run dev:frontend` (or `cd frontend && npm run dev`)
- Logs: backend `backend/uvicorn.*.log`, frontend `frontend/vite.*.log`

4. MongoDB + Compass

- Compose starts `mongo` on `localhost:27017`. Backend will persist results if `MONGO_URI` is set (e.g., `mongodb://mongo:27017` in Docker or `mongodb://localhost:27017` locally).
- In MongoDB Compass, connect to `mongodb://localhost:27017`, open DB `malariaai`, collection `results` to view stored inferences. Each document includes `summary`, `detections`, `annotated_image_url`, `source_filename`, and `created_at`.

API Endpoints

- `GET /health` — health check.
  Node API (UI talks to these):
- `POST /api/v1/infer` — single image; forwards to Python, saves via Mongoose, returns `{ id, result }`.
- `POST /api/v1/infer/batch` — multiple images; forwards, saves, returns `batch_id` and items.
- `GET /api/v1/results` — list saved results.
- `GET /api/v1/results/:id` — get a specific result.

Python service (internal):

- `POST /api/v1/infer` — raw inference used by Node.
- `POST /api/v1/infer/batch`
- `WS /ws/infer/stream` — UI connects directly for live overlay.

Notes

- If `ultralytics` or the model file are not available, a dummy detector returns no detections but the API remains functional.
- Static artifacts served under `/static/*` (annotated, uploads, tmp).
- Prometheus metrics registered (counters/histograms) for inference.

Planned Extensions

- MLflow model registry integration and versioned model loading.
- Redis-backed queue for async batch jobs and rate limiting.
- Sentry error tracking (enable via `MALARIAAI_ENABLE_SENTRY=true` and `SENTRY_DSN`).
- ONNX/TensorRT inference paths.
  Model Integration

- Option A — MERN (Node ONNX, recommended for pure MERN)

  - Place your weights at `models/best.onnx`.
  - If you only have `best.pt`, convert with:
    - Create/activate your Python venv
    - `pip install ultralytics opencv-python-headless`
    - `python backend/scripts/export_onnx.py --pt ./models/best.pt --onnx ./models/best.onnx`
  - Set in `server/.env` (already defaulted):
    - `ONNX_MODEL_PATH=../models/best.onnx`
    - `CLASS_NAMES=parasite` (comma-separated if multiple classes)
  - Run Node API: `cd server && npm run dev` — console will print `ONNX model loaded`.

- Option B — Python (Ultralytics YOLO .pt)
  - In `backend/.env`: set `MALARIAAI_DISABLE_ULTRALYTICS=false`
  - Install deps in your venv: `pip install ultralytics opencv-python-headless numpy==1.26.4`
  - Put `models/best.pt` in the repo.
  - Start backend: `python backend/run_server.py`

UI Theme

- Updated visuals with a clean white background, blue header/nav, and red-accented tabs/buttons.
- Components are wrapped in subtle white cards with rounded corners and shadows.

## Admin: reload model & running tests

- Runtime model reload (FastAPI admin endpoint)

  - Set a simple admin token in backend environment: `MALARIAAI_ADMIN_TOKEN=your_secret`
  - Reload model via HTTP POST to the Python service:
    - curl example (PowerShell):
      ```powershell
      curl -X POST "http://localhost:8000/api/v1/admin/reload_model?model_path=C:\\path\\to\\new.pt" -H "X-Admin-Token: your_secret"
      ```
    - The endpoint returns `{ "reloaded": true, "model_path": "..." }` on success.
  - You can also use the developer admin UI in the frontend: set `VITE_SHOW_ADMIN=1` in `frontend/.env`, start the frontend and use the admin controls in the header to send the token and optional model path.

- End-to-end smoke & e2e tests
  - A smoke test script that loads the same model resolution logic and runs a tiny inference is available at `scripts/smoke_model_test.py`.
    - Run it with the project venv: `venv2\Scripts\python.exe scripts\smoke_model_test.py`
  - An end-to-end test that posts an image to the running backend and verifies the annotated image URL is reachable is at `scripts/test_e2e.py`:
    - Ensure the FastAPI backend is running on `http://127.0.0.1:8000`.
    - Run: `venv2\Scripts\python.exe scripts\test_e2e.py`
