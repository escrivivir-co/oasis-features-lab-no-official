import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Herramientas de diagnóstico para GPU con node-llama-cpp
 */
export class GPUDiagnostics {
  
  /**
   * Verificar si hay GPU NVIDIA disponible
   */
  static async checkNvidiaGPU() {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free --format=csv,noheader,nounits');
      const lines = stdout.trim().split('\n');
      
      return lines.map(line => {
        const [name, total, used, free] = line.split(', ');
        return {
          name: name.trim(),
          vram: {
            total: parseInt(total),
            used: parseInt(used),
            free: parseInt(free),
            usagePercent: Math.round((parseInt(used) / parseInt(total)) * 100)
          }
        };
      });
    } catch (error) {
      return null; // No hay GPU NVIDIA o nvidia-smi no disponible
    }
  }

  /**
   * Verificar si CUDA está disponible
   */
  static async checkCUDA() {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader');
      
      // Verificar si nvcc está disponible (opcional para node-llama-cpp)
      let cudaVersion = 'Unknown';
      let nvccAvailable = false;
      
      try {
        const { stdout: nvccOutput } = await execAsync('nvcc --version');
        if (nvccOutput.includes('release')) {
          cudaVersion = nvccOutput.match(/release (\d+\.\d+)/)?.[1] || 'Unknown';
          nvccAvailable = true;
        }
      } catch (nvccError) {
        // nvcc no disponible, pero eso está bien para node-llama-cpp
      }
      
      return {
        available: true,
        driverVersion: stdout.trim(),
        cudaVersion,
        nvccAvailable,
        note: nvccAvailable ? 
          'CUDA Toolkit completo disponible' : 
          'Driver NVIDIA disponible (suficiente para node-llama-cpp)'
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  /**
   * Obtener información completa del sistema para node-llama-cpp
   */
  static async getSystemInfo() {
    const gpuInfo = await this.checkNvidiaGPU();
    const cudaInfo = await this.checkCUDA();
    
    return {
      gpu: gpuInfo,
      cuda: cudaInfo,
      recommendations: this.getRecommendations(gpuInfo, cudaInfo)
    };
  }

  /**
   * Generar recomendaciones basadas en el hardware
   */
  static getRecommendations(gpuInfo, cudaInfo) {
    const recommendations = [];

    if (!gpuInfo) {
      recommendations.push({
        type: 'warning',
        message: 'No se detectó GPU NVIDIA. El modelo ejecutará en CPU.'
      });
      return recommendations;
    }

    const gpu = gpuInfo[0]; // Primera GPU
    const totalVRAM = gpu.vram.total;
    const freeVRAM = gpu.vram.free;

    recommendations.push({
      type: 'info',
      message: `GPU detectada: ${gpu.name} con ${totalVRAM}MB VRAM`
    });

    // Recomendaciones basadas en VRAM disponible
    if (freeVRAM < 4000) {
      recommendations.push({
        type: 'warning',
        message: 'VRAM limitada (<4GB libre). Considera usar menos capas GPU.'
      });
    } else if (freeVRAM < 8000) {
      recommendations.push({
        type: 'info', 
        message: 'VRAM moderada. Configuración automática debería funcionar bien.'
      });
    } else {
      recommendations.push({
        type: 'success',
        message: 'Excelente cantidad de VRAM. Puedes cargar modelos grandes completamente en GPU.'
      });
    }

    // Configuraciones sugeridas
    const suggestedConfig = this.getSuggestedConfig(totalVRAM, freeVRAM);
    recommendations.push({
      type: 'config',
      message: 'Configuración sugerida',
      config: suggestedConfig
    });

    return recommendations;
  }

  /**
   * Obtener configuración sugerida basada en VRAM
   */
  static getSuggestedConfig(totalVRAM, freeVRAM) {
    if (freeVRAM < 4000) {
      return {
        gpu: true,
        gpuLayers: 10, // Solo algunas capas en GPU
        vramPadding: 64,
        note: 'VRAM limitada - configuración conservadora'
      };
    } else if (freeVRAM < 8000) {
      return {
        gpu: true,
        gpuLayers: undefined, // Automático
        vramPadding: 128,
        note: 'VRAM moderada - configuración balanceada'
      };
    } else {
      return {
        gpu: true,
        gpuLayers: undefined, // Automático - máximo
        vramPadding: 256,
        note: 'VRAM abundante - configuración óptima'
      };
    }
  }

  /**
   * Monitorear uso de VRAM durante inferencia
   */
  static async monitorVRAM(duration = 10000) {
    const measurements = [];
    const interval = 1000; // Cada segundo
    const iterations = duration / interval;

    console.log(`🔍 Monitoreando VRAM por ${duration/1000} segundos...`);

    for (let i = 0; i < iterations; i++) {
      const gpuInfo = await this.checkNvidiaGPU();
      if (gpuInfo && gpuInfo[0]) {
        measurements.push({
          timestamp: new Date().toISOString(),
          used: gpuInfo[0].vram.used,
          free: gpuInfo[0].vram.free,
          usagePercent: gpuInfo[0].vram.usagePercent
        });
      }
      
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    return measurements;
  }

  /**
   * Test de rendimiento básico
   */
  static async benchmarkConfig(modelHandler, testPrompt = "Hello, how are you?") {
    console.log('🚀 Ejecutando benchmark de rendimiento...');
    
    const startTime = Date.now();
    
    // Monitorear VRAM durante la inferencia
    const vramPromise = this.monitorVRAM(30000); // 30 segundos máximo
    
    try {
      const result = await modelHandler.chat(testPrompt, "");
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Detener monitoreo
      const vramData = await Promise.race([
        vramPromise,
        new Promise(resolve => setTimeout(() => resolve([]), duration + 1000))
      ]);
      
      return {
        success: true,
        duration,
        response: result.answer,
        vramUsage: vramData,
        tokensPerSecond: this.estimateTokensPerSecond(result.answer, duration)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Estimar tokens por segundo (aproximado)
   */
  static estimateTokensPerSecond(text, durationMs) {
    // Estimación rough: ~1.3 tokens por palabra
    const estimatedTokens = text.split(' ').length * 1.3;
    const seconds = durationMs / 1000;
    return Math.round((estimatedTokens / seconds) * 100) / 100;
  }

  /**
   * Generar reporte completo del sistema
   */
  static async generateReport() {
    console.log('📊 Generando reporte de diagnóstico GPU...\n');
    
    const systemInfo = await this.getSystemInfo();
    
    console.log('='.repeat(60));
    console.log('🔧 DIAGNÓSTICO GPU PARA NODE-LLAMA-CPP');
    console.log('='.repeat(60));
    
    // Información de GPU
    if (systemInfo.gpu) {
      console.log('\n🎯 GPU DETECTADA:');
      systemInfo.gpu.forEach((gpu, index) => {
        console.log(`  GPU ${index}: ${gpu.name}`);
        console.log(`  VRAM Total: ${gpu.vram.total}MB`);
        console.log(`  VRAM Usada: ${gpu.vram.used}MB (${gpu.vram.usagePercent}%)`);
        console.log(`  VRAM Libre: ${gpu.vram.free}MB`);
      });
    } else {
      console.log('\n❌ NO SE DETECTÓ GPU NVIDIA');
    }
    
    // Información de CUDA
    console.log('\n🔧 CUDA:');
    if (systemInfo.cuda.available) {
      console.log(`  Estado: ✅ ${systemInfo.cuda.note}`);
      console.log(`  Driver NVIDIA: ${systemInfo.cuda.driverVersion}`);
      if (systemInfo.cuda.nvccAvailable) {
        console.log(`  Versión CUDA: ${systemInfo.cuda.cudaVersion}`);
      } else {
        console.log(`  CUDA Toolkit: No instalado (no necesario para node-llama-cpp)`);
      }
    } else {
      console.log(`  Estado: ❌ No disponible`);
    }
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    systemInfo.recommendations.forEach(rec => {
      const icon = rec.type === 'success' ? '✅' : 
                   rec.type === 'warning' ? '⚠️' : 
                   rec.type === 'config' ? '⚙️' : 'ℹ️';
      
      console.log(`  ${icon} ${rec.message}`);
      
      if (rec.config) {
        console.log(`     Configuración sugerida:`);
        console.log(`     gpu: ${rec.config.gpu}`);
        console.log(`     gpuLayers: ${rec.config.gpuLayers || 'automático'}`);
        console.log(`     vramPadding: ${rec.config.vramPadding}MB`);
        console.log(`     Nota: ${rec.config.note}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    return systemInfo;
  }
}

/**
 * Función de conveniencia para diagnóstico rápido
 */
export async function quickGPUCheck() {
  return await GPUDiagnostics.generateReport();
}