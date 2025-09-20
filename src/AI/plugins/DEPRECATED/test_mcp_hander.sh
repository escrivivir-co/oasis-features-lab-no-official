#!/bin/bash
PORT=${PORT:-4001}

echo "🧪 Testing MCP Native Handler Implementation..."
echo "=================================================="

echo "=== Test 1: /ai node_llama_cpp_MCP_functions: true ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current server status?", "node_llama_cpp_MCP_functions": true}' 
echo ""

echo "=== Test 2: /ai node_llama_cpp_MCP_functions: true (Apple price) ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "node_llama_cpp_MCP_functions": true}' 
echo ""

echo "=== Test 3: /ai node_llama_cpp_MCP_functions: true (Current time) ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What time is it?", "node_llama_cpp_MCP_functions": true}' 
echo ""

echo "🧪 MCP Native Handler tests completed!"