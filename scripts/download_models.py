#!/usr/bin/env python3
"""
Download ONNX models for Vulpes Celare image processing.

Models:
- PaddleOCR v5 Detection (English)
- PaddleOCR v5 Recognition (English) 
- UltraFace for face detection
"""

import os
from pathlib import Path

try:
    from huggingface_hub import hf_hub_download
except ImportError:
    print("Please install huggingface_hub: pip install huggingface_hub")
    exit(1)

# Create model directories
models_dir = Path(__file__).parent.parent / "models"
ocr_dir = models_dir / "ocr"
vision_dir = models_dir / "vision"

ocr_dir.mkdir(parents=True, exist_ok=True)
vision_dir.mkdir(parents=True, exist_ok=True)

print("Downloading PaddleOCR models...")

# Download detection model (v5)
det_path = hf_hub_download(
    repo_id="monkt/paddleocr-onnx",
    filename="detection/v5/det.onnx",
    local_dir=str(models_dir / "hf_cache"),
)
# Copy to expected location
import shutil
shutil.copy(det_path, ocr_dir / "det.onnx")
print(f"✓ Detection model saved to {ocr_dir / 'det.onnx'}")

# Download recognition model (English)
rec_path = hf_hub_download(
    repo_id="monkt/paddleocr-onnx", 
    filename="languages/english/rec.onnx",
    local_dir=str(models_dir / "hf_cache"),
)
shutil.copy(rec_path, ocr_dir / "rec.onnx")
print(f"✓ Recognition model saved to {ocr_dir / 'rec.onnx'}")

print("\nDownloading UltraFace model...")

# Download UltraFace directly from ONNX Model Zoo
import urllib.request
ultraface_url = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/ultraface/models/version-RFB-640.onnx"
ultraface_dest = vision_dir / "ultraface.onnx"
try:
    urllib.request.urlretrieve(ultraface_url, str(ultraface_dest))
    print(f"✓ UltraFace model saved to {ultraface_dest}")
except Exception as e:
    print(f"⚠ UltraFace download failed: {e}")
    print("  You can manually download from: https://github.com/onnx/models")

print("\n✅ All models downloaded successfully!")
print(f"\nModel locations:")
print(f"  OCR Detection:    {ocr_dir / 'det.onnx'}")
print(f"  OCR Recognition:  {ocr_dir / 'rec.onnx'}")
print(f"  Face Detection:   {vision_dir / 'ultraface.onnx'}")
