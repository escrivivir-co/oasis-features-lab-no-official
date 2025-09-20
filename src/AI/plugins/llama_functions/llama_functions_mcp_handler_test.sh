



#!/bin/bash
PORT=${PORT:-4001}

echo "🧪 Testing implementations..."
echo "=================================================="

echo "=== Test 1 for MCP tools use: /ai llama_MCP_functions: true ==="

curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current server status?", "llama_MCP_functions": true}'
echo ""


