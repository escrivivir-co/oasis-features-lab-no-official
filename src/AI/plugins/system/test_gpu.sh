#!/bin/bash

echo "🔧 Testing GPU configuration for node-llama-cpp..."
echo ""

# Verificar GPU
echo "1. Checking GPU availability:"
nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader

echo ""
echo "2. Testing GPU diagnostics:"
node -e "
import('./gpu_diagnostics.mjs').then(async (module) => {
  const { quickGPUCheck } = module;
  await quickGPUCheck();
}).catch(console.error);
"

echo ""
echo "3. Testing local model with GPU (basic test):"
node -e "
import('./node_llama_cpp_handler.mjs').then(async (module) => {
  const { getNodeLlamaCppHandler } = module;
  
  console.log('🚀 Testing with GPU enabled...');
  
  try {
    // Configuración con GPU habilitada
    const handler = await getNodeLlamaCppHandler({
      gpu: true,
      gpuLayers: undefined, // automático
      vramPadding: 128
    });
    
    await handler.initialize();
    console.log('✅ Model initialized with GPU support!');
    
    // Test básico
    const result = await handler.chat('What is 2+2?', '');
    console.log('📝 Test result:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}).catch(console.error);
"

echo ""
echo "🏁 GPU test completed!"