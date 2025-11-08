import os
import sys
import platform
import uuid
from datetime import datetime
from collections import Counter

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
YOLO = None
_YOLO_IMPORT_ERROR = None
_DLL_DIRS_ADDED = []

# On Windows, ensure Torch's DLL directory is in the loader search path
if os.name == 'nt':
    try:
        candidates = []
        # Site-packages under the active interpreter/venv
        candidates.append(os.path.join(sys.prefix, 'Lib', 'site-packages', 'torch', 'lib'))
        # Any site-packages path on sys.path
        for p in list(sys.path):
            if p and p.lower().endswith('site-packages'):
                candidates.append(os.path.join(p, 'torch', 'lib'))
        # Local fallback relative to this file (useful if launched from IDE)
        _this_dir = os.path.abspath(os.path.dirname(__file__))
        candidates.append(os.path.join(_this_dir, 'myenv', 'Lib', 'site-packages', 'torch', 'lib'))
        seen = set()
        for c in candidates:
            try:
                c = os.path.normpath(c)
                if c and c not in seen and os.path.isdir(c):
                    seen.add(c)
                    # Prefer the modern AddDllDirectory when available (Py3.8+)
                    if hasattr(os, 'add_dll_directory'):
                        os.add_dll_directory(c)
                    # Also prepend to PATH to help any child process/tools
                    os.environ['PATH'] = c + os.pathsep + os.environ.get('PATH', '')
                    _DLL_DIRS_ADDED.append(c)
            except Exception:
                pass
        # Work around possible OpenMP duplicate load issues in some PATH setups
        os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')
    except Exception:
        # Best-effort — keep running even if this fails
        pass
try:
    # Defer import so the app can start even if Torch GPU DLLs are missing
    from ultralytics import YOLO as _YOLO
    YOLO = _YOLO
except Exception as e:
    _YOLO_IMPORT_ERROR = str(e)
    print(f"[ERROR] Failed to import ultralytics/torch: {e}")


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOAD_DIR = os.path.join(STATIC_DIR, 'uploads')
OUTPUT_DIR = os.path.join(STATIC_DIR, 'outputs')
for d in (STATIC_DIR, UPLOAD_DIR, OUTPUT_DIR):
    os.makedirs(d, exist_ok=True)

def pick_model_path():
    candidates = []
    env_p = os.environ.get('MODEL_PATH')
    if env_p:
        candidates.append(env_p)
    candidates.append(os.path.join(BASE_DIR, 'models', 'best.pt'))
    candidates.append(os.path.join(BASE_DIR, 'best.pt'))
    candidates.append(os.path.join(os.path.dirname(BASE_DIR), 'best.pt'))
    for p in candidates:
        try:
            if p and os.path.isfile(p):
                return p
        except Exception:
            pass
    return env_p or os.path.join(BASE_DIR, 'models', 'best.pt')

MODEL_PATH = pick_model_path()
CONF = float(os.environ.get('CONF', '0.25'))
IOU = float(os.environ.get('IOU', '0.45'))
IMGSZ = int(os.environ.get('IMGSZ', '640'))

app = Flask(__name__)
CORS(app)

print(f"[INFO] Initial model path candidate: {MODEL_PATH}")
_MODEL_ERRORS = []
_MODEL_TRIED = []
model = None
if YOLO is not None:
    base_parent = os.path.dirname(BASE_DIR)
    candidates = [
        os.environ.get('MODEL_PATH') or '',
        MODEL_PATH,
        os.path.join(BASE_DIR, 'models', 'best.pt'),
        os.path.join(BASE_DIR, 'best.pt'),
        os.path.join(base_parent, 'best.pt'),
        os.path.join(base_parent, 'runs', 'detect', 'train', 'weights', 'best.pt'),
        'best.pt',
    ]
    seen = set()
    ordered = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            ordered.append(c)
    for p in ordered:
        _MODEL_TRIED.append(p)
        try:
            if os.path.isfile(p):
                print(f"[INFO] Attempting to load model: {p}")
                model = YOLO(p)
                MODEL_PATH = p
                print("[INFO] Model loaded successfully")
                break
            else:
                _MODEL_ERRORS.append(f"Not found: {p}")
        except Exception as e:
            _MODEL_ERRORS.append(f"{p}: {e}")
            print(f"[ERROR] Failed to load YOLO model at {p}: {e}")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png','jpg','jpeg','bmp','tiff'}


@app.get('/health')
def health():
    cls = {}
    try:
        cls = getattr(model, 'names', {}) if model is not None else {}
    except Exception:
        cls = {}
    torch_info = {}
    try:
        import torch as _t
        cuda_v = getattr(getattr(_t, 'version', None), 'cuda', None)
        torch_info = {
            'version': getattr(_t, '__version__', None),
            'cuda': cuda_v,
            'debug': getattr(_t, 'version', None) is not None and getattr(_t.version, 'debug', False)
        }
    except Exception as _te:
        torch_info = { 'error': str(_te) }
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'conf': CONF,
        'iou': IOU,
        'imgsz': IMGSZ,
        'classes': cls,
        'classes_count': len(cls) if isinstance(cls, (dict, list)) else 0,
        'tried_paths': _MODEL_TRIED,
        'load_errors': _MODEL_ERRORS[:5],
        'yolo_imported': YOLO is not None,
        'yolo_import_error': _YOLO_IMPORT_ERROR,
        'dll_dirs_added': _DLL_DIRS_ADDED,
        'torch': torch_info,
        'platform': {
            'system': platform.system(),
            'release': platform.release(),
            'python': platform.python_version(),
            'executable': sys.executable,
        },
    })


@app.get('/')
def index():
    return (
        """<!doctype html>
<html>
  <head>
    <meta charset='utf-8'/>
    <meta name='viewport' content='width=device-width, initial-scale=1'/>
    <title>YOLO Inference Service</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:2rem;line-height:1.6;color:#111} code{background:#f3f4f6;padding:.2rem .4rem;border-radius:.25rem} a{color:#b91c1c;text-decoration:none} a:hover{text-decoration:underline}</style>
  </head>
  <body>
    <h1>YOLO Inference Service</h1>
    <ul>
      <li>Health: <a href='/health'>/health</a></li>
      <li>Infer (POST): <code>/api/v1/infer</code></li>
      <li>Infer Batch (POST): <code>/api/v1/infer/batch</code></li>
      <li>Static outputs: <code>/static/outputs/...</code></li>
    </ul>
  </body>
</html>""",
        200,
        {"Content-Type": "text/html; charset=utf-8"},
    )


@app.get('/favicon.ico')
def favicon():
    return ("", 204)


def run_infer_save(image_path: str, conf: float, iou: float):
    if model is None:
        return [], None, {}
    image = cv2.imread(image_path)
    if image is None:
        return [], None, {}
    img_h, img_w = image.shape[:2]
    results = model.predict(source=image_path, conf=conf, iou=iou, imgsz=IMGSZ, device='cpu', verbose=False)
    r = results[0]
    names = getattr(r, 'names', getattr(model, 'names', {}))
    try:
        boxes = r.boxes.xyxy.tolist()
        classes = [int(c) for c in r.boxes.cls.tolist()]
        scores = r.boxes.conf.tolist()
    except Exception:
        boxes, classes, scores = [], [], []

    # build detections list and counts
    dets = []
    counter = Counter()
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    for box, cls_id, sc in zip(boxes, classes, scores):
        x1, y1, x2, y2 = map(int, box)
        label = str(names[int(cls_id)] if isinstance(names, dict) and int(cls_id) in names else names[int(cls_id)] if isinstance(names, list) and int(cls_id) < len(names) else f"class_{int(cls_id)}")
        counter[label] += 1
        cv2.rectangle(image_rgb, (x1, y1), (x2, y2), (255, 0, 0), 4)
        cv2.putText(image_rgb, f"{label} {sc:.2f}", (x1, max(0, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3)
        dets.append({
            'class_id': int(cls_id),
            'label': label,
            'score': float(sc),
            'bbox': {'x': float(x1), 'y': float(y1), 'w': float(x2-x1), 'h': float(y2-y1)}
        })
    out_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    out_name = f"processed_{uuid.uuid4().hex}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    cv2.imwrite(out_path, out_bgr)

    total = sum(counter.values())
    # Derived metrics
    area_mpx = max(1e-9, float(img_w * img_h) / 1_000_000.0)
    density_per_mpx = float(total) / area_mpx if area_mpx > 0 else float(total)
    avg_conf = float(sum(scores) / len(scores)) if scores else 0.0
    if total > 100_000:
        severity = 'Severe'
    elif total < 100_000:
        severity = 'Moderate'
    elif 0 < total <= 1_000:
        severity = 'Low'
    else:
        severity = 'None'
    # Specific category counts to aid downstream clinical metrics
    trophozoites = 0
    wbcs = 0
    for k, v in counter.items():
        name = str(k).lower()
        # Trophozoites (asexual) — include targeted synonyms only
        # Avoid broad terms like 'infect' or 'plasmo' that may match RBC labels
        if (
            'troph' in name or 'tropho' in name or 'ring' in name or
            'parasite' in name or name in ('trophozoite', 'ring form', 'parasite')
        ):
            trophozoites += int(v)
        # WBCs — common synonyms
        if ('wbc' in name or 'white blood' in name or 'leukocyte' in name or name == 'wbc'):
            wbcs += int(v)

    summary = {
        'total': total,
        'by_class': dict(counter),
        'counts_by_category': { 'trophozoites': int(trophozoites), 'wbcs': int(wbcs) },
        'trophozoites_count': int(trophozoites),
        'wbcs_count': int(wbcs),
        'severity': severity,
        'rationale': f"Detected {total} objects across classes {dict(counter)}.",
        'image_width': int(img_w),
        'image_height': int(img_h),
        'area_megapixels': float(area_mpx),
        'density_per_megapixel': float(density_per_mpx),
        'avg_confidence': float(avg_conf)
    }
    return dets, out_name, summary


@app.post('/api/v1/infer')
def infer_single():
    f = request.files.get('file') or request.files.get('image')
    conf = float(request.args.get('conf', CONF))
    iou = float(request.args.get('iou', IOU))
    if not f or not allowed_file(f.filename):
        return jsonify({'error': 'file is required'}), 400
    fn = f"{int(datetime.utcnow().timestamp()*1000)}_{uuid.uuid4().hex}_{f.filename}"
    up = os.path.join(UPLOAD_DIR, fn)
    f.save(up)
    dets, out_name, summary = run_infer_save(up, conf, iou)
    annotated_url = f"/static/outputs/{out_name}" if out_name else None
    return jsonify({
        'detections': dets,
        'summary': summary,
        'annotated_image_url': annotated_url,
        'source_filename': f.filename
    })


@app.post('/api/v1/infer/batch')
def infer_batch():
    files = request.files.getlist('files') or request.files.getlist('images')
    conf = float(request.args.get('conf', CONF))
    iou = float(request.args.get('iou', IOU))
    if not files:
        return jsonify({'error': 'files are required'}), 400
    items = []
    for f in files:
        try:
            fn = f"{int(datetime.utcnow().timestamp()*1000)}_{uuid.uuid4().hex}_{f.filename}"
            up = os.path.join(UPLOAD_DIR, fn)
            f.save(up)
            dets, out_name, summary = run_infer_save(up, conf, iou)
            items.append({
                'id': uuid.uuid4().hex,
                'status': 'done',
                'result': {
                    'detections': dets,
                    'summary': summary,
                    'annotated_image_url': f"/static/outputs/{out_name}" if out_name else None,
                    'source_filename': f.filename
                }
            })
        except Exception as e:
            items.append({'id': uuid.uuid4().hex, 'status': 'error', 'error': str(e)})
    return jsonify({'batch_id': uuid.uuid4().hex, 'items': items})


@app.get('/static/<path:path>')
def serve_static(path):
    return send_from_directory(STATIC_DIR, path)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '7000'))
    app.run(host='0.0.0.0', port=port)
