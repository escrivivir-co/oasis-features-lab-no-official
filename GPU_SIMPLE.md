# 🚀 OASIS GPU - Configuración Simplificada

## 💡 **La Realidad: node-llama-cpp es MUY inteligente**

`node-llama-cpp` v3.13.0 maneja automáticamente:
- ✅ Detección de GPU NVIDIA
- ✅ Compilación con CUDA si está disponible  
- ✅ Fallback automático a CPU
- ✅ Optimización de capas GPU/CPU
- ✅ Gestión de memoria VRAM

## 🎯 **Lo ÚNICO que necesitas configurar:**

### **1. Acceso GPU en Docker (YA HECHO):**
```yaml
# docker-compose.yml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

### **2. Variables de entorno (YA CONFIGURADAS):**
```bash
GPU_ENABLED=true      # node-llama-cpp decide automáticamente
GPU_LAYERS=auto       # node-llama-cpp optimiza automáticamente  
VRAM_PADDING=256      # Reserva VRAM para estabilidad
```

### **3. Dependencias de compilación (YA AÑADIDAS):**
```dockerfile
# Dockerfile - Solo para que node-llama-cpp pueda compilar
RUN apt-get install -y git cmake build-essential
```

## 🚀 **Uso súper simple:**

```bash
# Iniciar OASIS (GPU automática si disponible)
npm run up

# Verificar que AI funciona
npm run ai:health
npm run ai:test

# Ver logs del AI service
npm run ai:logs
```

## 🎉 **¡Eso es todo!**

- Si tienes GPU NVIDIA + drivers → node-llama-cpp la usa automáticamente
- Si no tienes GPU compatible → node-llama-cpp usa CPU automáticamente  
- Si hay problemas → logs muestran el fallback y razón

**No necesitas gestionar nada manualmente.** 🤖✨