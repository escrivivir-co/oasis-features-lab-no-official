



#!/bin/bash
PORT=${PORT:-3011}

echo "🧪 Testing implementations..."
echo "=================================================="

echo "=== Test 1 for MCP tools use: /ai useFunctionsDev: true ==="



curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current server status?", "useFunctionsDev": true}'
echo ""
