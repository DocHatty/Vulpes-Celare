#!/usr/bin/env python3
"""
Python bridge for loading parquet datasets into Vulpes Cortex
Outputs JSON that Node.js can consume
"""

import sys
import json
import argparse
import pandas as pd
from pathlib import Path

def load_parquet(file_path, limit=None):
    """Load parquet file and convert to JSON-serializable format"""
    try:
        # Read parquet
        df = pd.read_parquet(file_path)

        # Apply limit if specified
        if limit:
            df = df.head(limit)

        # Convert to records
        records = df.to_dict('records')

        # Process entities (convert string representation to actual objects if needed)
        for record in records:
            # Ensure entities is a list of dicts
            if 'entities' in record and isinstance(record['entities'], str):
                try:
                    record['entities'] = json.loads(record['entities'])
                except:
                    record['entities'] = []

            # Ensure all fields are JSON-serializable
            for key, value in list(record.items()):
                if pd.isna(value):
                    record[key] = None

        return records

    except Exception as e:
        print(f"Error loading parquet: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Load parquet dataset for Vulpes')
    parser.add_argument('file', help='Path to parquet file')
    parser.add_argument('--limit', type=int, help='Limit number of documents')

    args = parser.parse_args()

    # Load data
    data = load_parquet(args.file, args.limit)

    # Output as JSON
    print(json.dumps(data))

if __name__ == '__main__':
    main()
