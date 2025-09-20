#!/bin/bash
PORT=${PORT:-3011}

echo "🧪 Testing MCP Native Handler Implementation..."
echo "=================================================="

echo "=== Test 1: /ai useFunctionsMcpNative: true ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current server status?", "useFunctionsMcpNative": true}' 
echo ""

echo "=== Test 2: /ai useFunctionsMcpNative: true (Apple price) ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctionsMcpNative": true}' 
echo ""

echo "=== Test 3: /ai useFunctionsMcpNative: true (Current time) ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What time is it?", "useFunctionsMcpNative": true}' 
echo ""

echo "🧪 MCP Native Handler tests completed!"