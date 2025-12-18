#!/usr/bin/env python3
"""
Cortex Brain - Python Intelligence Service for Vulpes Celare

This module provides offline intelligence capabilities that Python excels at:
- Audit log analysis with Pandas
- Model fine-tuning with PyTorch
- Confidence threshold calibration
- ONNX model export

Communication: JSON via stdin/stdout with the Node.js CortexPythonBridge.
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

# ============================================================================
# TASK HANDLERS
# ============================================================================

def analyze_audit_logs(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze audit logs to identify missed PHI patterns.
    
    Input:
        log_path: Path to audit log (Parquet, CSV, or JSON)
        lookback_days: Number of days to analyze
        
    Output:
        top_unredacted_patterns: Most common missed patterns
        confidence_distribution: Histogram of confidence scores
        recommendations: Suggested threshold adjustments
    """
    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        return {"error": "pandas/numpy not installed. Run: pip install pandas numpy"}
    
    log_path = input_data.get("log_path", "")
    lookback_days = input_data.get("lookback_days", 30)
    
    if not log_path or not os.path.exists(log_path):
        return {"error": f"Log file not found: {log_path}"}
    
    # Load audit data
    ext = Path(log_path).suffix.lower()
    try:
        if ext == ".parquet":
            df = pd.read_parquet(log_path)
        elif ext == ".csv":
            df = pd.read_csv(log_path)
        elif ext == ".json":
            df = pd.read_json(log_path, lines=True)
        else:
            return {"error": f"Unsupported file format: {ext}"}
    except Exception as e:
        return {"error": f"Failed to load log: {str(e)}"}
    
    # Filter by date if timestamp column exists
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        cutoff = datetime.now() - timedelta(days=lookback_days)
        df = df[df["timestamp"] >= cutoff]
    
    results = {
        "total_records": len(df),
        "date_range": {
            "start": str(df["timestamp"].min()) if "timestamp" in df.columns else "N/A",
            "end": str(df["timestamp"].max()) if "timestamp" in df.columns else "N/A",
        },
    }
    
    # Analyze false negatives (missed redactions)
    if "false_negative" in df.columns:
        fn = df[df["false_negative"] == True]
        results["false_negative_count"] = len(fn)
        
        if "pattern_type" in fn.columns:
            pattern_counts = fn["pattern_type"].value_counts().head(10).to_dict()
            results["top_unredacted_patterns"] = pattern_counts
    
    # Analyze confidence distribution
    if "confidence" in df.columns:
        conf = df["confidence"].dropna()
        results["confidence_distribution"] = {
            "mean": float(conf.mean()),
            "std": float(conf.std()),
            "min": float(conf.min()),
            "max": float(conf.max()),
            "percentiles": {
                "25": float(conf.quantile(0.25)),
                "50": float(conf.quantile(0.50)),
                "75": float(conf.quantile(0.75)),
                "90": float(conf.quantile(0.90)),
                "95": float(conf.quantile(0.95)),
            }
        }
    
    # Analyze by PHI type
    if "phi_type" in df.columns:
        type_stats = df.groupby("phi_type").agg({
            "confidence": ["mean", "std", "count"]
        }).round(4)
        type_stats.columns = ["mean_confidence", "std_confidence", "count"]
        results["phi_type_stats"] = type_stats.to_dict("index")
    
    # Generate recommendations
    recommendations = []
    
    if results.get("false_negative_count", 0) > 0:
        fn_rate = results["false_negative_count"] / max(results["total_records"], 1)
        if fn_rate > 0.05:
            recommendations.append({
                "priority": "HIGH",
                "message": f"False negative rate is {fn_rate:.1%}. Consider lowering confidence thresholds.",
            })
    
    if "confidence_distribution" in results:
        if results["confidence_distribution"]["mean"] < 0.7:
            recommendations.append({
                "priority": "MEDIUM",
                "message": "Average confidence is low. Consider retraining models on domain-specific data.",
            })
    
    results["recommendations"] = recommendations
    return results


def calibrate_thresholds(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calibrate confidence thresholds using ROC curve analysis.
    
    Input:
        predictions_path: Path to predictions with labels
        target_sensitivity: Desired sensitivity (recall)
        
    Output:
        optimal_thresholds: Per-PHI-type thresholds
        roc_auc: Area under ROC curve
    """
    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        return {"error": "pandas/numpy not installed"}
    
    predictions_path = input_data.get("predictions_path", "")
    target_sensitivity = input_data.get("target_sensitivity", 0.95)
    
    if not predictions_path or not os.path.exists(predictions_path):
        return {"error": f"Predictions file not found: {predictions_path}"}
    
    # Load predictions
    ext = Path(predictions_path).suffix.lower()
    if ext == ".parquet":
        df = pd.read_parquet(predictions_path)
    elif ext == ".csv":
        df = pd.read_csv(predictions_path)
    else:
        return {"error": f"Unsupported format: {ext}"}
    
    required_cols = ["confidence", "is_phi"]
    if not all(col in df.columns for col in required_cols):
        return {"error": f"Missing required columns: {required_cols}"}
    
    # Calculate ROC curve
    from collections import defaultdict
    
    thresholds_to_test = np.arange(0.1, 1.0, 0.05)
    results_by_threshold = []
    
    for thresh in thresholds_to_test:
        predicted = df["confidence"] >= thresh
        actual = df["is_phi"].astype(bool)
        
        tp = ((predicted) & (actual)).sum()
        fp = ((predicted) & (~actual)).sum()
        fn = ((~predicted) & (actual)).sum()
        tn = ((~predicted) & (~actual)).sum()
        
        sensitivity = tp / max(tp + fn, 1)
        specificity = tn / max(tn + fp, 1)
        precision = tp / max(tp + fp, 1)
        f1 = 2 * (precision * sensitivity) / max(precision + sensitivity, 0.001)
        
        results_by_threshold.append({
            "threshold": float(thresh),
            "sensitivity": float(sensitivity),
            "specificity": float(specificity),
            "precision": float(precision),
            "f1": float(f1),
        })
    
    # Find threshold that achieves target sensitivity
    optimal_threshold = 0.5
    for r in results_by_threshold:
        if r["sensitivity"] >= target_sensitivity:
            optimal_threshold = r["threshold"]
            break
    
    # Calculate AUC (trapezoidal integration)
    sensitivities = [r["sensitivity"] for r in results_by_threshold]
    specificities = [r["specificity"] for r in results_by_threshold]
    fpr = [1 - s for s in specificities]
    
    # Sort by FPR
    points = sorted(zip(fpr, sensitivities))
    auc = 0.0
    for i in range(1, len(points)):
        auc += (points[i][0] - points[i-1][0]) * (points[i][1] + points[i-1][1]) / 2
    
    return {
        "optimal_threshold": optimal_threshold,
        "target_sensitivity": target_sensitivity,
        "roc_auc": float(auc),
        "threshold_analysis": results_by_threshold,
    }


def train_ocr_model(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fine-tune OCR model on domain-specific data.
    
    Input:
        training_data_path: Path to training images
        epochs: Number of training epochs
        output_path: Where to save the fine-tuned model
        
    Output:
        training_loss: Final training loss
        onnx_path: Path to exported ONNX model
    """
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
    except ImportError:
        return {"error": "PyTorch not installed. Run: pip install torch"}
    
    training_data_path = input_data.get("training_data_path", "")
    epochs = input_data.get("epochs", 10)
    output_path = input_data.get("output_path", "./models/fine_tuned_ocr.onnx")
    
    if not training_data_path or not os.path.exists(training_data_path):
        return {"error": f"Training data not found: {training_data_path}"}
    
    # This is a simplified training stub
    # Real implementation would:
    # 1. Load training images and labels
    # 2. Create a DataLoader
    # 3. Fine-tune the recognition model
    # 4. Export to ONNX
    
    # For now, return a message indicating this needs real data
    return {
        "status": "not_implemented",
        "message": "Full training requires labeled medical document images.",
        "requirements": [
            "training_images/: Directory of text images",
            "labels.csv: Text labels for each image",
        ],
        "next_steps": [
            "Collect domain-specific training data",
            "Label with actual text content",
            "Run training with: epochs >= 50 for good results"
        ],
        "config": {
            "epochs_requested": epochs,
            "output_path": output_path,
        }
    }


def export_onnx(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Export a PyTorch model to ONNX format.
    
    Input:
        model_path: Path to PyTorch model (.pt)
        output_path: Where to save ONNX model
        input_shape: Expected input tensor shape
        
    Output:
        onnx_path: Path to exported model
        model_size_mb: Size of exported model
    """
    try:
        import torch
    except ImportError:
        return {"error": "PyTorch not installed"}
    
    model_path = input_data.get("model_path", "")
    output_path = input_data.get("output_path", "./model.onnx")
    input_shape = input_data.get("input_shape", [1, 3, 224, 224])
    
    if not model_path or not os.path.exists(model_path):
        return {"error": f"Model not found: {model_path}"}
    
    try:
        # Load model
        model = torch.load(model_path, map_location="cpu")
        model.eval()
        
        # Create dummy input
        dummy_input = torch.randn(*input_shape)
        
        # Export to ONNX
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "output": {0: "batch_size"},
            }
        )
        
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        
        return {
            "onnx_path": output_path,
            "model_size_mb": round(size_mb, 2),
            "input_shape": input_shape,
        }
    except Exception as e:
        return {"error": f"Export failed: {str(e)}"}


def health_check(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Check system health and available dependencies."""
    deps = {}
    
    try:
        import pandas
        deps["pandas"] = pandas.__version__
    except ImportError:
        deps["pandas"] = None
    
    try:
        import numpy
        deps["numpy"] = numpy.__version__
    except ImportError:
        deps["numpy"] = None
    
    try:
        import torch
        deps["torch"] = torch.__version__
        deps["cuda_available"] = torch.cuda.is_available()
    except ImportError:
        deps["torch"] = None
        deps["cuda_available"] = False
    
    try:
        import onnx
        deps["onnx"] = onnx.__version__
    except ImportError:
        deps["onnx"] = None
    
    try:
        import pyarrow
        deps["pyarrow"] = pyarrow.__version__
    except ImportError:
        deps["pyarrow"] = None
    
    return {
        "status": "healthy",
        "python_version": sys.version,
        "dependencies": deps,
        "available_tasks": [
            "analyze_audit_logs",
            "calibrate_thresholds",
            "train_ocr_model",
            "export_onnx",
            "health_check",
        ]
    }


# ============================================================================
# TASK ROUTER
# ============================================================================

TASK_HANDLERS = {
    "analyze_audit_logs": analyze_audit_logs,
    "calibrate_thresholds": calibrate_thresholds,
    "train_ocr_model": train_ocr_model,
    "export_onnx": export_onnx,
    "health_check": health_check,
}


def process_task(request: Dict[str, Any]) -> Dict[str, Any]:
    """Route task to appropriate handler."""
    task_type = request.get("task")
    input_data = request.get("input", {})
    
    if task_type not in TASK_HANDLERS:
        return {
            "success": False,
            "error": f"Unknown task: {task_type}",
            "available_tasks": list(TASK_HANDLERS.keys()),
        }
    
    try:
        result = TASK_HANDLERS[task_type](input_data)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """Main entry point - read JSON from stdin, process, write to stdout."""
    try:
        # Read all input
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "No input received"}))
            return
        
        request = json.loads(raw_input)
        response = process_task(request)
        print(json.dumps(response))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {str(e)}"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Unexpected error: {str(e)}"}))


if __name__ == "__main__":
    main()
