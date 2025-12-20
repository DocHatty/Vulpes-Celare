#!/usr/bin/env python3
"""
ONNX Model Quantization Script for Vulpes Celare

This script quantizes ONNX models to INT8 precision for faster inference.
INT8 quantization typically provides 2-4x speedup with minimal accuracy loss.

Requirements:
    pip install onnxruntime onnx onnxruntime-tools

Usage:
    python scripts/quantize-models.py                    # Quantize all models
    python scripts/quantize-models.py --model gliner     # Quantize specific model
    python scripts/quantize-models.py --validate         # Validate after quantization

Supported Models:
    - gliner: Zero-shot NER model
    - tinybert: Confidence re-ranking model  
    - fp_classifier: False positive classifier
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Optional, List, Tuple

try:
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType
    from onnxruntime.quantization.shape_inference import quant_pre_process
    import onnxruntime as ort
except ImportError as e:
    print("Error: Required packages not installed.")
    print("Run: pip install onnxruntime onnx onnxruntime-tools")
    sys.exit(1)


# Model configurations
MODELS = {
    "gliner": {
        "input": "gliner/model.onnx",
        "output": "gliner/model.int8.onnx",
        "description": "GLiNER zero-shot NER model"
    },
    "tinybert": {
        "input": "tinybert/model.onnx",
        "output": "tinybert/model.int8.onnx",
        "description": "TinyBERT confidence ranker"
    },
    "fp_classifier": {
        "input": "fp_classifier/model.onnx",
        "output": "fp_classifier/model.int8.onnx",
        "description": "False positive classifier"
    }
}


def get_models_dir() -> Path:
    """Get the models directory path."""
    # Check environment variable
    if os.environ.get("VULPES_MODELS_DIR"):
        return Path(os.environ["VULPES_MODELS_DIR"])
    
    # Default: ./models relative to project root
    script_dir = Path(__file__).parent
    return script_dir.parent / "models"


def quantize_model(
    input_path: Path,
    output_path: Path,
    model_name: str,
    per_channel: bool = False,
    reduce_range: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Quantize an ONNX model to INT8.
    
    Args:
        input_path: Path to input FP32 model
        output_path: Path to save INT8 model
        model_name: Name for logging
        per_channel: Use per-channel quantization (more accurate but slower)
        reduce_range: Reduce quantization range for older CPUs
    
    Returns:
        Tuple of (success, error_message)
    """
    print(f"\n{'='*60}")
    print(f"Quantizing: {model_name}")
    print(f"{'='*60}")
    print(f"  Input:  {input_path}")
    print(f"  Output: {output_path}")
    
    if not input_path.exists():
        return False, f"Input model not found: {input_path}"
    
    try:
        # Get input model size
        input_size_mb = input_path.stat().st_size / (1024 * 1024)
        print(f"  Input size: {input_size_mb:.2f} MB")
        
        # Pre-process for quantization (shape inference)
        print("  Step 1/3: Pre-processing model...")
        preprocessed_path = input_path.parent / f"{input_path.stem}_preprocessed.onnx"
        
        try:
            quant_pre_process(str(input_path), str(preprocessed_path))
            model_to_quantize = preprocessed_path
        except Exception as e:
            print(f"  Warning: Pre-processing failed ({e}), using original model")
            model_to_quantize = input_path
        
        # Quantize the model
        print("  Step 2/3: Quantizing to INT8...")
        quantize_dynamic(
            model_input=str(model_to_quantize),
            model_output=str(output_path),
            per_channel=per_channel,
            reduce_range=reduce_range,
            weight_type=QuantType.QInt8,
            optimize_model=True
        )
        
        # Clean up preprocessed model
        if preprocessed_path.exists():
            preprocessed_path.unlink()
        
        # Get output model size
        output_size_mb = output_path.stat().st_size / (1024 * 1024)
        reduction = (1 - output_size_mb / input_size_mb) * 100
        
        print(f"  Step 3/3: Validation...")
        print(f"  Output size: {output_size_mb:.2f} MB ({reduction:.1f}% reduction)")
        
        # Validate the quantized model loads correctly
        try:
            session = ort.InferenceSession(
                str(output_path),
                providers=["CPUExecutionProvider"]
            )
            print(f"  Inputs: {[i.name for i in session.get_inputs()]}")
            print(f"  Outputs: {[o.name for o in session.get_outputs()]}")
            print(f"  SUCCESS: {model_name} quantized successfully")
            return True, None
        except Exception as e:
            return False, f"Quantized model validation failed: {e}"
            
    except Exception as e:
        return False, f"Quantization failed: {e}"


def validate_model(model_path: Path, model_name: str) -> Tuple[bool, Optional[str]]:
    """Validate that a model can be loaded and run."""
    print(f"\nValidating: {model_name}")
    print(f"  Path: {model_path}")
    
    if not model_path.exists():
        return False, f"Model not found: {model_path}"
    
    try:
        session = ort.InferenceSession(
            str(model_path),
            providers=["CPUExecutionProvider"]
        )
        
        # Get model info
        inputs = session.get_inputs()
        outputs = session.get_outputs()
        
        print(f"  Inputs: {len(inputs)}")
        for inp in inputs:
            print(f"    - {inp.name}: {inp.shape} ({inp.type})")
        
        print(f"  Outputs: {len(outputs)}")
        for out in outputs:
            print(f"    - {out.name}: {out.shape} ({out.type})")
        
        print(f"  Status: VALID")
        return True, None
        
    except Exception as e:
        return False, f"Validation failed: {e}"


def main():
    parser = argparse.ArgumentParser(
        description="Quantize ONNX models for Vulpes Celare"
    )
    parser.add_argument(
        "--model",
        choices=list(MODELS.keys()) + ["all"],
        default="all",
        help="Model to quantize (default: all)"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate models after quantization"
    )
    parser.add_argument(
        "--per-channel",
        action="store_true",
        help="Use per-channel quantization (more accurate, slower)"
    )
    parser.add_argument(
        "--reduce-range",
        action="store_true",
        help="Reduce quantization range (for older CPUs)"
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        help="Override models directory path"
    )
    
    args = parser.parse_args()
    
    # Get models directory
    models_dir = args.models_dir or get_models_dir()
    print(f"Models directory: {models_dir}")
    
    if not models_dir.exists():
        print(f"Error: Models directory not found: {models_dir}")
        print("Run 'npm run models:download' to download models first.")
        sys.exit(1)
    
    # Determine which models to process
    if args.model == "all":
        models_to_process = list(MODELS.keys())
    else:
        models_to_process = [args.model]
    
    results: List[Tuple[str, bool, Optional[str]]] = []
    
    # Quantize models
    for model_name in models_to_process:
        config = MODELS[model_name]
        input_path = models_dir / config["input"]
        output_path = models_dir / config["output"]
        
        success, error = quantize_model(
            input_path=input_path,
            output_path=output_path,
            model_name=model_name,
            per_channel=args.per_channel,
            reduce_range=args.reduce_range
        )
        results.append((model_name, success, error))
    
    # Validate if requested
    if args.validate:
        print("\n" + "="*60)
        print("VALIDATION")
        print("="*60)
        
        for model_name in models_to_process:
            config = MODELS[model_name]
            output_path = models_dir / config["output"]
            
            if output_path.exists():
                validate_model(output_path, f"{model_name} (INT8)")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    success_count = 0
    for model_name, success, error in results:
        status = "SUCCESS" if success else f"FAILED: {error}"
        print(f"  {model_name}: {status}")
        if success:
            success_count += 1
    
    print(f"\nTotal: {success_count}/{len(results)} models quantized successfully")
    
    if success_count < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
