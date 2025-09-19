#!/bin/bash

echo "🚀 Starting Oasis AI Service with GPU optimization..."
echo ""

# Verificar VRAM disponible
echo "🔍 Checking GPU status..."
nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free --format=csv,noheader,nounits 2>/dev/null || {
    echo "❌ No NVIDIA GPU detected. Starting in CPU mode..."
    GPU_ENABLED=false node ./ai_service.mjs
    exit 0
}

# Obtener VRAM libre
FREE_VRAM=$(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits | head -1)
echo "📊 Available VRAM: ${FREE_VRAM}MB"

# Configuración automática basada en VRAM disponible
if [ "$FREE_VRAM" -lt 4000 ]; then
    echo "⚠️ Limited VRAM (<4GB). Starting in conservative GPU mode..."
    GPU_ENABLED=true GPU_LAYERS=10 VRAM_PADDING=512 node ./ai_service.mjs
elif [ "$FREE_VRAM" -lt 8000 ]; then
    echo "✅ Moderate VRAM (4-8GB). Starting in balanced GPU mode..."
    GPU_ENABLED=true GPU_LAYERS=auto VRAM_PADDING=512 node ./ai_service.mjs
elif [ "$FREE_VRAM" -lt 16000 ]; then
    echo "🎯 Good VRAM (8-16GB). Starting in optimized GPU mode..."
    GPU_ENABLED=true GPU_LAYERS=auto VRAM_PADDING=256 node ./ai_service.mjs
else
    echo "🚀 Excellent VRAM (>16GB). Starting in high-performance GPU mode..."
    GPU_ENABLED=true GPU_LAYERS=auto VRAM_PADDING=512 node ./ai_service.mjs
fi