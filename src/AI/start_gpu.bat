@echo off
echo 🎯 Starting Oasis AI Service with GPU optimization...
set GPU_ENABLED=true
set GPU_LAYERS=auto
set VRAM_PADDING=256
node ./ai_service.mjs