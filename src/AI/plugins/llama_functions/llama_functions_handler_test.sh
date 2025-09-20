#!/bin/bash
PORT=${PORT:-4001}

echo "🧪 Testing implementations..."
echo "=================================================="

# Test 1: /ai with functions (local model + generalized functions)
echo "=== Test 1: /ai llama_functions : true ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "llama_functions": true}' 
echo ""
