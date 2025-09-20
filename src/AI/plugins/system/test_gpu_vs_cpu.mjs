// Enhanced test to verify GPU vs CPU usage with detailed logging
import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testInferenceDetailed(gpu = 'auto', testName = 'Unknown') {
  console.log(`\n🧪 Testing ${testName}...`);
  
  try {
    console.log(`⚙️  Config: gpu=${gpu}, vramPadding=256MB`);
    
    // Get llama instance with detailed logging
    const llama = await getLlama({
      gpu: gpu,
      build: 'never',
      usePrebuiltBinaries: true,
      skipDownload: true,
      vramPadding: 256,
      logLevel: 'info', // More verbose logging
      progressLogs: true,
      debug: false
    });

    // Log GPU info if available
    try {
      const gpuInfo = await llama.getGpuDeviceNames?.();
      if (gpuInfo && gpuInfo.length > 0) {
        console.log(`🎯 Available GPU devices: ${gpuInfo.join(', ')}`);
      } else {
        console.log(`🖥️  No GPU devices available`);
      }
    } catch (e) {
      console.log(`ℹ️  GPU info not available: ${e.message}`);
    }

    // Find the model
    const modelPath = join(__dirname, '../../models/oasis-42-1-chat.Q4_K_M.gguf');
    
    console.log(`📂 Loading model: ${modelPath}`);
    
    // Load model with GPU layer info
    const model = await llama.loadModel({
      modelPath: modelPath,
      gpuLayers: gpu === false ? 0 : undefined, // 0 layers for CPU, auto for GPU
    });

    // Log model info
    try {
      const modelInfo = await model.getModelInfo?.() || {};
      console.log(`📊 Model info:`, {
        architecture: modelInfo.architecture || 'unknown',
        parameterCount: modelInfo.parameterCount || 'unknown',
        vocabSize: modelInfo.vocabSize || 'unknown'
      });
    } catch (e) {
      console.log(`ℹ️  Model info not available`);
    }

    // Create context
    const context = await model.createContext({
      contextSize: 4096,
    });

    // Log context info
    try {
      const contextInfo = {
        contextSize: context.contextSize,
        modelPath: context.model?.modelPath || 'unknown'
      };
      console.log(`🧠 Context info:`, contextInfo);
    } catch (e) {
      console.log(`ℹ️  Context info not available`);
    }

    // Create chat session  
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    console.log('🤖 Running inference...');
    const startTime = Date.now();
    
    const response = await session.prompt("What GPU are you running on? Respond briefly.");
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Response:', response);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🚀 Estimated tokens/sec: ${estimateTokensPerSecond(response, duration)}`);
    
    // Cleanup
    session.dispose?.();
    context.dispose();
    model.dispose();
    llama.dispose();
    
    return { success: true, duration, response, tokensPerSec: estimateTokensPerSecond(response, duration) };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

function estimateTokensPerSecond(text, durationMs) {
  // Rough estimation: ~1.3 tokens per word
  const estimatedTokens = text.split(' ').length * 1.3;
  const seconds = durationMs / 1000;
  return Math.round((estimatedTokens / seconds) * 100) / 100;
}

async function main() {
  console.log('Node Llama CPP - Detailed GPU vs CPU Test');
  console.log('='.repeat(50));
  
  // Test GPU first with detailed info
  console.log('\n📋 Testing GPU mode (auto detection)...');
  const gpuResult = await testInferenceDetailed('auto', 'GPU AUTO');
  
  console.log('\n📋 Testing CPU mode (forced)...');
  const cpuResult = await testInferenceDetailed(false, 'CPU ONLY');
  
  // Compare results
  console.log('\n' + '='.repeat(50));
  console.log('📊 COMPARISON SUMMARY:');
  console.log('='.repeat(50));
  
  if (gpuResult.success && cpuResult.success) {
    console.log(`GPU Duration: ${gpuResult.duration}ms (${gpuResult.tokensPerSec} tokens/sec)`);
    console.log(`CPU Duration: ${cpuResult.duration}ms (${cpuResult.tokensPerSec} tokens/sec)`);
    
    const speedup = (cpuResult.duration / gpuResult.duration).toFixed(2);
    console.log(`🚀 GPU Speedup: ${speedup}x faster than CPU`);
    
    if (speedup > 1.5) {
      console.log('✅ GPU acceleration is working effectively!');
    } else {
      console.log('⚠️  GPU acceleration may not be active or effective');
    }
  }
}

main().catch(console.error);