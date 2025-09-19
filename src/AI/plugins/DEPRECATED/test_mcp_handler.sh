#!/bin/bash
PORT=${PORT:-3011}

echo "🧪 Testing MCP Integration..."
echo "=================================================="

echo "=== Test 1: MCP Tool - Get Server Status ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the current server status?", "useFunctionsProd": true}' 
echo ""
echo ""

echo "=== Test 2: MCP Tool - List Available Prompts ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "Can you list all available prompts in the system?", "useFunctionsProd": true}' 
echo ""
echo ""

echo "=== Test 3: MCP Tool - Get Simulator Status ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "Show me the current UserSimulator status", "useFunctionsProd": true}' 
echo ""
echo ""

echo "=== Test 4: Original Function Still Works ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "What is the price of an apple?", "useFunctionsProd": true}' 
echo ""
echo ""

echo "=== Test 5: MCP Tool - Analyze Game Context ==="
curl -X POST http://localhost:${PORT}/ai \
  -H "Content-Type: application/json" \
  -d '{"input": "Analyze the current game context with recommendations", "useFunctionsProd": true}' 
echo ""