#!/bin/bash

# Test Suite Setup Script
# Ensures all dependencies are installed and project is built

set -e

echo "🦊 Vulpes Celare - Test Suite Setup"
echo "===================================="
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from repository root"
    echo "   cd /path/to/Vulpes-Celare"
    exit 1
fi

echo "1. Installing main dependencies..."
npm install

echo ""
echo "2. Building TypeScript..."
npm run build

echo ""
echo "3. Installing Cortex dependencies..."
cd tests/master-suite/cortex
npm install
cd ../../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Run tests with:"
echo "  node tests/master-suite/run.js --count=1000"
echo ""
