@echo off
echo 🚀 Starting Oasis AI Service with GPU optimization (Windows)...
echo.

REM Check if NVIDIA GPU is available
nvidia-smi >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ No NVIDIA GPU detected. Starting in CPU mode...
    set GPU_ENABLED=false
    node ./ai_service.mjs
    exit /b 0
)

REM Get available VRAM
for /f "tokens=1" %%i in ('nvidia-smi --query-gpu^=memory.free --format^=csv,noheader,nounits') do set FREE_VRAM=%%i
echo 📊 Available VRAM: %FREE_VRAM%MB

REM Auto-configure based on available VRAM
if %FREE_VRAM% lss 4000 (
    echo ⚠️ Limited VRAM (^<%FREE_VRAM%MB^). Starting in conservative GPU mode...
    set GPU_ENABLED=true
    set GPU_LAYERS=10
    set VRAM_PADDING=512
) else if %FREE_VRAM% lss 8000 (
    echo ✅ Moderate VRAM (4-8GB). Starting in balanced GPU mode...
    set GPU_ENABLED=true
    set GPU_LAYERS=auto
    set VRAM_PADDING=512
) else if %FREE_VRAM% lss 16000 (
    echo 🎯 Good VRAM (8-16GB). Starting in optimized GPU mode...
    set GPU_ENABLED=true
    set GPU_LAYERS=auto
    set VRAM_PADDING=256
) else (
    echo 🚀 Excellent VRAM (^>16GB). Starting in high-performance GPU mode...
    set GPU_ENABLED=true
    set GPU_LAYERS=auto
    set VRAM_PADDING=512
)

node ./ai_service.mjs