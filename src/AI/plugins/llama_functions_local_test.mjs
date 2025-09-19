import path from "path";
import { fileURLToPath } from "url";
import { createLocalLlamaHandler, LOCAL_FUNCTION_CONFIGS } from "./llama_functions_local.mjs";
import { GPUDiagnostics } from "./gpu_diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRefactoredFunctions() {
  console.log('🚀 TESTING REFACTORED LLAMA FUNCTIONS WITH GPU');
  console.log('='.repeat(60));
  
  try {
    // Verificar VRAM antes
    const beforeVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM antes: ${beforeVRAM[0].vram.used}MB usada`);
    
    // Configuración con GPU habilitada
    const modelPath = path.join(__dirname, "..", "models", "oasis-42-1-chat.Q4_K_M.gguf");
    
    const config = {
      gpu: true,
      gpuLayers: undefined, // Automático
      vramPadding: 256,
    };
    
    console.log('⚙️ Configuración:');
    console.log(`   Modelo: ${modelPath}`);
    console.log(`   GPU: ${config.gpu}`);
    console.log(`   GPU Layers: ${config.gpuLayers || 'auto'}`);
    console.log(`   VRAM Padding: ${config.vramPadding}MB`);
    console.log('');
    
    // Crear handler con funciones
    console.log('📥 Creando handler con funciones...');
    const handler = createLocalLlamaHandler(
      modelPath,
      ["fruits", "system"], // Cargar funciones de frutas y sistema
      config
    );
    
    // Inicializar
    await handler.initialize();
    
    // Verificar VRAM después de cargar
    const afterVRAM = await GPUDiagnostics.checkNvidiaGPU();
    const vramUsed = afterVRAM[0].vram.used - beforeVRAM[0].vram.used;
    console.log(`🎯 VRAM después de cargar: ${afterVRAM[0].vram.used}MB usada`);
    console.log(`📊 VRAM del modelo: ~${vramUsed}MB`);
    console.log('');
    
    // Test 1: Función simple (getFruitPrice)
    console.log('🧪 Test 1: Precio de fruta');
    const startTime1 = Date.now();
    
    try {
      const result1 = await handler.chat("What is the price of an apple?", "");
      const duration1 = Date.now() - startTime1;
      
      console.log('✅ Resultado Test 1:');
      console.log(`   Respuesta: ${result1.answer}`);
      console.log(`   Duración: ${duration1}ms`);
      console.log(`   Función llamada: ${result1.hadFunctionCalls ? 'Sí' : 'No'}`);
      console.log('');
    } catch (error) {
      console.error('❌ Error en Test 1:', error.message);
    }
    
    // Test 2: Función de tiempo
    console.log('🧪 Test 2: Tiempo actual');
    const startTime2 = Date.now();
    
    try {
      const result2 = await handler.chat("What time is it now?", "");
      const duration2 = Date.now() - startTime2;
      
      console.log('✅ Resultado Test 2:');
      console.log(`   Respuesta: ${result2.answer}`);
      console.log(`   Duración: ${duration2}ms`);
      console.log(`   Función llamada: ${result2.hadFunctionCalls ? 'Sí' : 'No'}`);
      console.log('');
    } catch (error) {
      console.error('❌ Error en Test 2:', error.message);
    }
    
    // Test 3: Sin funciones (respuesta directa)
    console.log('🧪 Test 3: Respuesta simple sin funciones');
    const startTime3 = Date.now();
    
    try {
      const result3 = await handler.chat("Hello, how are you?", "");
      const duration3 = Date.now() - startTime3;
      
      console.log('✅ Resultado Test 3:');
      console.log(`   Respuesta: ${result3.answer}`);
      console.log(`   Duración: ${duration3}ms`);
      console.log(`   Función llamada: ${result3.hadFunctionCalls ? 'Sí' : 'No'}`);
      console.log('');
    } catch (error) {
      console.error('❌ Error en Test 3:', error.message);
    }
    
    // Verificar VRAM final
    const finalVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM final: ${finalVRAM[0].vram.used}MB usada`);
    
    console.log('');
    console.log('🎉 ¡Tests de refactorización completados!');
    
    if (vramUsed > 1000) {
      console.log('✅ El modelo refactorizado funciona correctamente con GPU');
      console.log(`💪 GPU optimizada: ${vramUsed}MB VRAM utilizada`);
    }
    
  } catch (error) {
    console.error('❌ Error durante los tests:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar tests
testRefactoredFunctions().catch(console.error);