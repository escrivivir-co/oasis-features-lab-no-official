#!/bin/bash

echo "🧪 Testing implementations..."
echo "=================================================="

echo "=== Test 1: /ai useFunctionsDev: true ==="
curl -X POST http://localhost:4001/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctionsDev": true}' 
echo ""

