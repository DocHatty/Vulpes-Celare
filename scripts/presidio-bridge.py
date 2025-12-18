#!/usr/bin/env python3
"""
Presidio Bridge for Vulpes Celare Benchmarking

This script runs Microsoft Presidio on a set of documents and outputs
detection results in a format compatible with the comparison benchmark.

Usage:
    python presidio-bridge.py input.json output.json
"""

import json
import sys
from typing import List, Dict, Any

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
except ImportError:
    print("Error: presidio-analyzer not installed", file=sys.stderr)
    print("Run: pip install presidio-analyzer spacy", file=sys.stderr)
    print("Then: python -m spacy download en_core_web_lg", file=sys.stderr)
    sys.exit(1)


def map_presidio_type(entity_type: str) -> str:
    """Map Presidio entity types to Vulpes types for fair comparison."""
    mapping = {
        "PERSON": "NAME",
        "DATE_TIME": "DATE",
        "US_SSN": "SSN",
        "LOCATION": "ADDRESS",
        "PHONE_NUMBER": "PHONE",
        "EMAIL_ADDRESS": "EMAIL",
        "US_DRIVER_LICENSE": "LICENSE",
        "CREDIT_CARD": "CREDIT_CARD",
        "IP_ADDRESS": "IP_ADDRESS",
        "URL": "URL",
        "US_PASSPORT": "PASSPORT",
        "US_BANK_NUMBER": "ACCOUNT",
        "MEDICAL_LICENSE": "LICENSE",
        "NRP": "NPI",  # National Registration Provider (approximate)
    }
    return mapping.get(entity_type, entity_type)


def analyze_documents(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Run Presidio analysis on all documents."""
    
    # Initialize Presidio with spaCy
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
    }
    
    try:
        provider = NlpEngineProvider(nlp_configuration=configuration)
        nlp_engine = provider.create_engine()
        analyzer = AnalyzerEngine(nlp_engine=nlp_engine)
    except Exception as e:
        print(f"Warning: Could not load spaCy model, using default: {e}", file=sys.stderr)
        analyzer = AnalyzerEngine()
    
    results = []
    
    for doc in documents:
        doc_id = doc.get("id", "unknown")
        text = doc.get("text", "")
        ground_truth = doc.get("groundTruth", [])
        
        # Run Presidio analysis
        presidio_results = analyzer.analyze(
            text=text,
            language="en",
            entities=None,  # Detect all supported entities
        )
        
        # Convert to standard format
        detections = []
        for result in presidio_results:
            detections.append({
                "start": result.start,
                "end": result.end,
                "type": map_presidio_type(result.entity_type),
                "score": result.score,
                "text": text[result.start:result.end]
            })
        
        results.append({
            "documentId": doc_id,
            "detections": detections,
            "groundTruth": ground_truth
        })
    
    return results


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.json output.json", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # Load documents
    with open(input_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    # Process
    results = analyze_documents(documents)
    
    # Save results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    print(f"Processed {len(results)} documents", file=sys.stderr)


if __name__ == "__main__":
    main()
