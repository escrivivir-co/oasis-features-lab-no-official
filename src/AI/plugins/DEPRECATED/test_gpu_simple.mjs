import path from "path";
import { fileURLToPath } from "url";
import { getNodeLlamaCppHandler } from "../node_llama_cpp_handler.mjs";
import { GPUDiagnostics } from "../gpu_diagnostics.mjs";
import {
  getLlama,
  LlamaChatSession,
} from "node-llama-cpp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGPUSimple() {
  console.log('🚀 PRUEBA SIMPLE DE GPU PARA NODE-LLAMA-CPP');
  console.log('='.repeat(60));
  
  try {
    // Verificar VRAM antes
    const beforeVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM antes: ${beforeVRAM[0].vram.used}MB usada`);
    
    // Configuración simple y directa
    console.log('📥 Inicializando modelo directamente...');
    
    const modelPath = path.join(__dirname, "..", "models", "oasis-42-1-chat.Q4_K_M.gguf");
    console.log(`📂 Ruta del modelo: ${modelPath}`);
    
    const llama = await getLlama({
      gpu: true,
      vramPadding: 256,
      logger: {
        log: (level, message) => console.log(`[Llama ${level}]`, message),
      }
    });
    
    const model = await llama.loadModel({
      modelPath,
      gpuLayers: undefined, // Automático
    });
    
    const context = await model.createContext({
      threads: 1, // Para GPU
      contextSize: 2048,
    });
    
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });
    
    // Verificar VRAM después de cargar
    const afterVRAM = await GPUDiagnostics.checkNvidiaGPU();
    const vramUsed = afterVRAM[0].vram.used - beforeVRAM[0].vram.used;
    console.log(`🎯 VRAM después: ${afterVRAM[0].vram.used}MB usada`);
    console.log(`📊 VRAM del modelo: ~${vramUsed}MB`);
    
    // Test simple sin funciones
    console.log('\n🧪 Test simple: "Hello, how are you?"');
    const startTime = Date.now();
    
    const result = await session.prompt("Hello, how are you?", {
      maxTokens: 50,
      temperature: 0.7,
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Resultado:');
    console.log(`   Respuesta: ${result}`);
    console.log(`   Duración: ${duration}ms`);
    
    // Verificar VRAM final
    const finalVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM final: ${finalVRAM[0].vram.used}MB usada`);
    
    console.log('\n🎉 ¡Test simple completado exitosamente!');
    
    if (vramUsed > 1000) {
      console.log('✅ El modelo definitivamente se cargó en GPU');
      console.log(`💪 Tu GPU está funcionando perfectamente con ${vramUsed}MB de VRAM`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar test
testGPUSimple().catch(console.error);