#!/bin/bash
PORT=${PORT:-4001}
echo "🧪 Testing implementations..."
echo "=================================================="

echo "=== Test 1: /ai useFunctions : false ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctions": false}' 
echo ""
