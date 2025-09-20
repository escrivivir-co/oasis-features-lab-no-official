# =============================================================================
# NODE-LLAMA-CPP - Análisis de Capacidades y Requisitos
# Versión: 3.13.0 (usada en OASIS)
# =============================================================================

## 🎯 **CAPACIDADES DE ACELERACIÓN GPU**

### **1. NO necesita CUDA instalado directamente**
- `node-llama-cpp` compila su propia versión de llama.cpp
- Incluye soporte CUDA integrado si detecta GPU NVIDIA
- **NO requiere CUDA SDK/Toolkit instalado por el usuario**
- Descarga automáticamente las librerías CUDA necesarias

### **2. Backends de GPU soportados:**

#### **NVIDIA (CUDA) ✅ Recomendado**
- **Automático:** Detecta y usa GPU NVIDIA sin configuración
- **Requisitos:** Solo drivers NVIDIA actualizados
- **Performance:** 10-50x más rápido que CPU
- **VRAM:** Funciona desde 4GB, óptimo 8GB+

#### **AMD (ROCm) ⚠️ Experimental**
- **Soporte:** Limitado en node-llama-cpp
- **Requisitos:** ROCm drivers + configuración manual
- **Performance:** Variable, 2-10x más rápido que CPU

#### **Intel GPU (OpenCL) ⚠️ Básico**
- **Soporte:** Muy limitado
- **Requisitos:** Intel GPU drivers
- **Performance:** Marginal vs CPU

#### **Apple Silicon (Metal) ✅ Nativo**
- **Soporte:** Excelente en M1/M2/M3
- **Automático:** Sin configuración necesaria
- **Performance:** 5-20x más rápido que CPU

### **3. Compilación automática:**
```bash
# Lo que hace node-llama-cpp automáticamente:
1. Detecta hardware disponible
2. Descarga llama.cpp source
3. Compila con opciones optimizadas
4. Integra CUDA si está disponible
5. Fallback a CPU si GPU no disponible
```

## ⚙️ **CONFIGURACIÓN EN OASIS**

### **Variables de entorno utilizadas:**
```bash
GPU_ENABLED=true/false     # Activar/desactivar GPU
GPU_LAYERS=auto           # Capas en GPU (auto, 0-100, número específico)
VRAM_PADDING=256          # MB de VRAM a reservar
```

### **Configuración Docker actual:**
```yaml
# docker-compose.yml - NVIDIA GPU
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

## 🔧 **REQUISITOS DEL SISTEMA**

### **Para GPU NVIDIA (recomendado):**
- ✅ **GPU:** GTX 1060+ / RTX series / Tesla / Quadro
- ✅ **VRAM:** Mínimo 4GB, recomendado 8GB+
- ✅ **Drivers:** NVIDIA 470.57.02+ (Linux) / 471.96+ (Windows)
- ✅ **Docker:** NVIDIA Container Toolkit
- ❌ **NO necesita:** CUDA SDK instalado manualmente

### **Para CPU (fallback):**
- ✅ **CPU:** x86_64 con AVX2 (Intel 2013+, AMD 2015+)
- ✅ **RAM:** Mínimo 8GB, recomendado 16GB+
- ✅ **Threads:** Más cores = mejor performance

### **Para desarrollo:**
- ✅ **Compiladores:** gcc/clang, cmake, make
- ✅ **Git:** Para descargar llama.cpp source
- ✅ **Python:** Para scripts de build

## 📊 **PERFORMANCE ESPERADA**

### **Modelo Q4_K_M (4GB):**
```
RTX 4090:     ~50-80 tokens/sec
RTX 3080:     ~30-50 tokens/sec  
GTX 1080 Ti:  ~15-25 tokens/sec
CPU (16 core): ~3-8 tokens/sec
CPU (8 core):  ~1-4 tokens/sec
```

### **Factores que afectan performance:**
- **VRAM disponible:** Más VRAM = más capas en GPU
- **Modelo size:** Q4_K_M vs Q8_0 vs F16
- **Context length:** Más contexto = más memoria
- **Batch size:** Para múltiples requests

## 🚀 **OPTIMIZACIONES APLICADAS EN OASIS**

### **1. Configuración GPU automática:**
```javascript
// En ai_service_standalone.mjs
const GPU_ENABLED = process.env.GPU_ENABLED === 'true';
const GPU_LAYERS = process.env.GPU_LAYERS === 'auto' ? undefined : parseInt(process.env.GPU_LAYERS);
const VRAM_PADDING = parseInt(process.env.VRAM_PADDING) || 256;
```

### **2. Fallback inteligente:**
```javascript
llamaInstance = await getLlama({
  gpu: GPU_ENABLED,           // Auto-detect y usar GPU si disponible
  vramPadding: VRAM_PADDING,  // Reservar VRAM para estabilidad
  logger: GPU_ENABLED ? {     // Logging detallado para GPU
    log: (level, message) => console.log(`[Llama ${level}]`, message),
  } : undefined
});
```

### **3. Configuración de contexto optimizada:**
```javascript
context = await model.createContext({
  threads: GPU_ENABLED ? 1 : 4,  // Menos threads con GPU
  contextSize: 4096,             // Tamaño de contexto balanceado
});
```

## 🎯 **RECOMENDACIONES PARA TU SETUP**

### **Si tienes NVIDIA GPU:**
```bash
npm run dev:gpu      # Usar configuración GPU optimizada
npm run gpu:verify   # Verificar que funciona correctamente
```

### **Si no tienes GPU compatible:**
```bash
npm run dev:cpu      # Usar configuración CPU optimizada
```

### **Para debugging:**
```bash
npm run gpu:detect   # Detectar hardware disponible
npm run gpu:logs     # Monitorear logs de GPU/AI
npm run ai:status    # Estado detallado del servicio
```

## ⚠️ **PROBLEMAS COMUNES Y SOLUCIONES**

### **Error: "cmake not found"**
- **Causa:** node-llama-cpp necesita compilar llama.cpp
- **Solución:** ✅ Ya añadido cmake al Dockerfile

### **Error: "git not found"**
- **Causa:** node-llama-cpp descarga source via git
- **Solución:** ✅ Ya añadido git al Dockerfile

### **GPU no detectada:**
- **Verificar:** `nvidia-smi` en host
- **Docker:** NVIDIA Container Toolkit instalado
- **Logs:** `npm run gpu:logs` para diagnóstico

### **Out of memory (VRAM):**
- **Reducir:** `GPU_LAYERS` de auto a número menor
- **Aumentar:** `VRAM_PADDING` para estabilidad
- **Alternativa:** Usar modelo más pequeño

## 🎉 **CONCLUSIÓN**

node-llama-cpp v3.13.0 es muy inteligente:
- ✅ **Auto-detecta** y configura GPU NVIDIA automáticamente
- ✅ **NO necesita** CUDA SDK instalado manualmente
- ✅ **Compila optimizado** para tu hardware específico
- ✅ **Fallback robusto** a CPU si GPU no disponible
- ✅ **Performance excelente** con configuración mínima

Tu configuración en OASIS está bien optimizada! 🚀