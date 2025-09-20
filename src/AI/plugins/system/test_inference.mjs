// Test real inference with node-llama-cpp using the Oasis model
import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testInference(gpu = 'auto') {
  console.log(`\n🧪 Testing ${gpu === false ? 'CPU' : 'GPU'} inference...`);
  
  try {
    // Get llama instance
    const llama = await getLlama({
      gpu: gpu,
      build: 'never',
      usePrebuiltBinaries: true,
      skipDownload: true,
      vramPadding: 256,
      logLevel: 'warn',
      progressLogs: false
    });

    // Find the model
    const modelPath = join(__dirname, '../../models/oasis-42-1-chat.Q4_K_M.gguf');
    
    console.log(`📂 Loading model: ${modelPath}`);
    
    // Load model
    const model = await llama.loadModel({
      modelPath: modelPath,
    });

    // Create context
    const context = await model.createContext({
      contextSize: 4096,
    });

    // Create chat session  
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    console.log('🤖 Running inference...');
    const startTime = Date.now();
    
    const response = await session.prompt("Hello! How are you today?");
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Response:', response);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    // Cleanup
    context.dispose();
    model.dispose();
    llama.dispose();
    
    return { success: true, duration, response };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Node Llama CPP - Real Inference Test');
  console.log('='.repeat(48));
  
  // Test GPU first
  const gpuResult = await testInference('auto');
  
  if (!gpuResult.success) {
    console.log('\n⚠️  GPU failed, trying CPU...');
    await testInference(false);
  }
}

main().catch(console.error);