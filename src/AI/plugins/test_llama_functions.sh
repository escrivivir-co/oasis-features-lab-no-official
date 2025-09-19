#!/bin/bash
PORT=${PORT:-3011}

echo "🧪 Testing implementations..."
echo "=================================================="

# Test 1: /ai with functions (local model + generalized functions)
echo "=== Test 1: /ai useFunctionsDev : true ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctionsDev": true}' 
echo ""
