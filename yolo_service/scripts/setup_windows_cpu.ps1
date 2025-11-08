Param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Ensure-Venv {
  param([string]$Root)
  $venv = Join-Path $Root 'myenv'
  $py = Join-Path $venv 'Scripts/python.exe'
  if (-not (Test-Path $py)) {
    Write-Host 'Creating virtual environment...'
    & py -3 -m venv $venv
  }
  return $py
}

$root = Split-Path -Parent $PSScriptRoot
$python = Ensure-Venv -Root $root

Write-Host 'Activating venv...'
. (Join-Path $root 'myenv/Scripts/Activate.ps1')

$torchLib = Join-Path $root 'myenv/Lib/site-packages/torch/lib'
if (Test-Path $torchLib) {
  $env:PATH = "$torchLib;$env:PATH"
}
$env:KMP_DUPLICATE_LIB_OK = 'TRUE'

Write-Host 'Upgrading pip...'
python -m pip install --upgrade pip

Write-Host 'Removing existing torch/ultralytics...'
python -m pip uninstall -y torch torchvision torchaudio ultralytics 2>$null 1>$null || $true
python -m pip cache purge 2>$null 1>$null || $true

Write-Host 'Installing PyTorch CPU wheels (2.3.1)...'
python -m pip install --no-cache-dir torch==2.3.1+cpu torchvision==0.18.1+cpu torchaudio==2.3.1+cpu --index-url https://download.pytorch.org/whl/cpu

Write-Host 'Installing app requirements...'
python -m pip install --no-cache-dir -r (Join-Path $root 'requirements-windows-cpu.txt')

Write-Host 'Verifying imports...'
python - << 'PY'
import sys
try:
    import torch
    print('torch', torch.__version__, getattr(getattr(torch, 'version', None), 'cuda', None))
except Exception as e:
    print('torch import error:', e)
try:
    from ultralytics import YOLO
    print('ultralytics ok')
except Exception as e:
    print('ultralytics import error:', e)
PY

Write-Host "Done. You can run: `npython yolo_service/app.py`"

