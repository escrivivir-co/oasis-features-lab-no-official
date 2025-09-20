#!/bin/bash
PORT=${PORT:-3011}

echo "🧪 Testing implementations..."
echo "=================================================="

echo "=== Test 1: /ai useFunctionsProd: true ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctionsProd": true}' 
echo ""

