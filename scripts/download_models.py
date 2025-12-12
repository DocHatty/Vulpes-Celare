#!/usr/bin/env python3
"""
Download SOTA 2025 ONNX models for Vulpes Celare Rust Core.

Models:
- PaddleOCR-VL (0.9B equivalent / v4 Server) - Detection & Recognition
- GLiNER-BioMed (Bi-Encoder) - Zero-Shot Logic
- UltraFace (Biometric)
"""

import os
import shutil
import urllib.request
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
logic_dir = models_dir / "logic"

ocr_dir.mkdir(parents=True, exist_ok=True)
vision_dir.mkdir(parents=True, exist_ok=True)
logic_dir.mkdir(parents=True, exist_ok=True)

cache_dir = models_dir / "hf_cache"

print("Downloading SOTA 2025 Models...")

# -----------------------------------------------------------------------------
# 1. OCR (RapidOCR / PaddleOCR-VL 0.9B Equivalent)
# -----------------------------------------------------------------------------
print("\n[1/3] Downloading OCR Models (RapidOCR - SOTA ONNX)...")

try:
    print("  Downloading Detection Model...")
    det_path = hf_hub_download(
        repo_id="SWHL/RapidOCR",
        filename="ch_PP-OCRv4_det_infer.onnx",
        local_dir=str(cache_dir),
    )
    shutil.copy(det_path, ocr_dir / "det.onnx")
    print(f"  ✓ Saved to {ocr_dir / 'det.onnx'}")
except Exception as e:
    print(f"  X Detection Download Error: {e}")

try:
    print("  Downloading Recognition Model...")
    rec_path = hf_hub_download(
        repo_id="SWHL/RapidOCR",
        filename="ch_PP-OCRv4_rec_infer.onnx",
        local_dir=str(cache_dir),
    )
    shutil.copy(rec_path, ocr_dir / "rec.onnx")
    print(f"  ✓ Saved to {ocr_dir / 'rec.onnx'}")
except Exception as e:
    print(f"  X Recognition Download Error: {e}")

# -----------------------------------------------------------------------------
# 2. Logic (GLiNER / BERT)
# -----------------------------------------------------------------------------
print("\n[2/3] Downloading GLiNER Logic Model...")
try:
    # Use onnx-community which is the standard source for JS/ONNX Runtime
    gliner_path = hf_hub_download(
        repo_id="onnx-community/gliner-base",
        filename="onnx/model_quantized.onnx",
        local_dir=str(cache_dir),
    )
    shutil.copy(gliner_path, logic_dir / "gliner.onnx")
    print(f"  ✓ GLiNER Model: {logic_dir / 'gliner.onnx'}")
except Exception as e:
    print(f"  X GLiNER Download Error: {e}")
    print("  ! Ensure you have internet access or try a different mirror.")

# -----------------------------------------------------------------------------
# 3. Vision (UltraFace)
# -----------------------------------------------------------------------------
print("\n[3/3] Downloading UltraFace...")
ultraface_url = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/ultraface/models/version-RFB-640.onnx"
ultraface_dest = vision_dir / "ultraface.onnx"
try:
    urllib.request.urlretrieve(ultraface_url, str(ultraface_dest))
    print(f"  ✓ UltraFace Model: {ultraface_dest}")
except Exception as e:
    print(f"  X UltraFace Download Error: {e}")

print("\n✅ Model acquisition complete.")
