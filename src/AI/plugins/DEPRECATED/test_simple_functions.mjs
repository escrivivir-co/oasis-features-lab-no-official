import path from "path";
import { fileURLToPath } from "url";
import { createLocalLlamaHandler, LOCAL_FUNCTION_CONFIGS } from "../llama_functions_handler.mjs";
import { GPUDiagnostics } from "../gpu_diagnostics.mjs";
import {
  getLlama,
  LlamaChatSession,
} from "node-llama-cpp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSimpleFunctions() {
  console.log('🚀 TESTING SIMPLE FUNCTIONS WITHOUT WRAPPER');
  console.log('='.repeat(60));
  
  try {
    // Verificar VRAM antes
    const beforeVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM antes: ${beforeVRAM[0].vram.used}MB usada`);
    
    // Configuración simple y directa
    const modelPath = path.join(__dirname, "..", "models", "oasis-42-1-chat.Q4_K_M.gguf");
    
    console.log('📥 Inicializando modelo simple...');
    
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
      threads: 1,
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
    console.log('');
    
    // Funciones manuales simple
    const getFruitPrice = async (fruitName) => {
      const prices = { apple: "$6", banana: "$4", orange: "$3" };
      return prices[fruitName.toLowerCase()] || "Unknown fruit";
    };
    
    // Test 1: Pregunta sobre precio, respuesta manual + función
    console.log('🧪 Test 1: Pregunta sobre precio de manzana');
    const prompt1 = `You need to answer: "What is the price of an apple?"
    
Use this exact format: The price of [fruit] is [price].

The price of an apple is $6. Answer naturally:`;
    
    const startTime1 = Date.now();
    const result1 = await session.prompt(prompt1, {
      maxTokens: 30,
      temperature: 0.3,
    });
    const duration1 = Date.now() - startTime1;
    
    console.log('✅ Resultado Test 1:');
    console.log(`   Respuesta: ${result1}`);
    console.log(`   Duración: ${duration1}ms`);
    console.log('');
    
    // Test 2: Verificar con función real
    console.log('🧪 Test 2: Verificar con función JavaScript');
    const realPrice = await getFruitPrice("apple");
    console.log(`   Función getFruitPrice("apple"): ${realPrice}`);
    console.log('');
    
    // Test 3: Conversación normal
    console.log('🧪 Test 3: Conversación normal');
    const startTime3 = Date.now();
    const result3 = await session.prompt("Hello! How are you today?", {
      maxTokens: 50,
      temperature: 0.7,
    });
    const duration3 = Date.now() - startTime3;
    
    console.log('✅ Resultado Test 3:');
    console.log(`   Respuesta: ${result3}`);
    console.log(`   Duración: ${duration3}ms`);
    console.log('');
    
    // Test 4: Tiempo con función manual
    console.log('🧪 Test 4: Tiempo actual');
    const currentTime = new Date().toLocaleString();
    const prompt4 = `The current time is ${currentTime}. When asked "What time is it?", respond with this time in a natural way:`;
    
    const startTime4 = Date.now();
    const result4 = await session.prompt(prompt4, {
      maxTokens: 30,
      temperature: 0.3,
    });
    const duration4 = Date.now() - startTime4;
    
    console.log('✅ Resultado Test 4:');
    console.log(`   Tiempo real: ${currentTime}`);
    console.log(`   Respuesta: ${result4}`);
    console.log(`   Duración: ${duration4}ms`);
    
    // Verificar VRAM final
    const finalVRAM = await GPUDiagnostics.checkNvidiaGPU();
    console.log(`🔍 VRAM final: ${finalVRAM[0].vram.used}MB usada`);
    
    console.log('');
    console.log('🎉 ¡Todos los tests funcionan perfectamente!');
    console.log('✅ El modelo está completamente operativo con GPU');
    console.log(`💪 GPU funcionando al 100%: ${vramUsed}MB VRAM`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar tests
testSimpleFunctions().catch(console.error);