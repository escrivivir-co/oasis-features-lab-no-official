import path from "path";
import { fileURLToPath } from "url";
import { getLocalModelHandler } from "../node_llama_cpp_handler.mjs";
import { GPUDiagnostics } from "../system/gpu_diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGPUPerformance() {
  console.log('🚀 PRUEBA DE RENDIMIENTO GPU PARA NODE-LLAMA-CPP');
  console.log('='.repeat(60));
  
  const config = {
    gpu: true,
    gpuLayers: undefined, // Automático - carga todas las capas posibles en GPU
    vramPadding: 256, // 256MB de padding para GPU grande la mitad para normales --> es la cantidad de megas que no usará y así evitará colapsar la gpu
  };
  
  console.log('⚙️ Configuración de prueba:');
  console.log(`   GPU: ${config.gpu ? 'Habilitada' : 'Deshabilitada'}`);
  console.log(`   GPU Layers: ${config.gpuLayers || 'Automático'}`);
  console.log(`   VRAM Padding: ${config.vramPadding}MB`);
  console.log('');
  
  try {
    // Obtener handler con configuración GPU
    console.log('📥 Inicializando modelo con GPU...');
    const handler = await getLocalModelHandler(config);
    
    // Verificar VRAM antes de cargar
    const beforeVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM antes de cargar modelo: ${beforeVRAM[0].vram.used}MB usada`);
    
    await handler.initialize();
    
    // Verificar VRAM después de cargar
    const afterVRAM = await GPUDiagnostics.checkNvidiaGPU();
    const vramUsedByModel = afterVRAM[0].vram.used - beforeVRAM[0].vram.used;
    console.log(`🎯 VRAM después de cargar modelo: ${afterVRAM[0].vram.used}MB usada`);
    console.log(`📊 VRAM utilizada por el modelo: ~${vramUsedByModel}MB`);
    console.log('');
    
    // Test de función simple
    console.log('🧪 Ejecutando test de función...');
    const startTime = Date.now();
    
    const result = await handler.chat("What is the price of an apple?", "");
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Resultado del test:');
    console.log(`   Respuesta: ${result.answer}`);
    console.log(`   Duración: ${duration}ms`);
    console.log(`   Función llamada: ${result.hadFunctionCalls ? 'Sí' : 'No'}`);
    
    // Verificar VRAM final
    const finalVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM final: ${finalVRAM[0].vram.used}MB usada`);
    
    console.log('');
    console.log('🎉 ¡Test completado exitosamente!');
    
    if (vramUsedByModel > 1000) {
      console.log('✅ El modelo se cargó en GPU (usa >1GB VRAM)');
    } else {
      console.log('⚠️ El modelo podría estar ejecutándose en CPU (VRAM baja)');
    }
    
  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Ejecutar test
testGPUPerformance().catch(console.error);