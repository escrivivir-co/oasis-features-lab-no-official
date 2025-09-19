import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const PORT = process.env.PORT || 3011;

// ✅ GPU Configuration from environment variables
const GPU_ENABLED = process.env.GPU_ENABLED === 'true' || process.env.GPU_ENABLED === '1';
const GPU_LAYERS = process.env.GPU_LAYERS ? parseInt(process.env.GPU_LAYERS) : undefined;
const VRAM_PADDING = process.env.VRAM_PADDING ? parseInt(process.env.VRAM_PADDING) : (GPU_ENABLED ? 256 : 64);

console.log('🚀 AI Service Configuration:');
console.log(`   GPU Enabled: ${GPU_ENABLED ? 'YES' : 'NO'}`);
console.log(`   GPU Layers: ${GPU_LAYERS || 'auto'}`);
console.log(`   VRAM Padding: ${VRAM_PADDING}MB`);
console.log('');

// Plugin imports - solo si están disponibles
let functionsPlugin = null;
try {
  const { createLocalLlamaHandler } = await import('./plugins/llama_functions_local.mjs');
  const { getLocalModelHandler } = await import('./plugins/local_model_handler.mjs');
  functionsPlugin = { createLocalLlamaHandler, getLocalModelHandler };
} catch (error) {
  console.log('Functions plugin not available, running in basic mode');
}

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let llamaInstance, model, context, session;
let ready = false;
let lastError = null;

// Plugin handlers - inicializados cuando se necesiten
let functionHandlerProd = null;
let functionHandlerDev = null;

async function initModel() {
  if (model && ready) {
    console.log("AI Service: Model already loaded, skipping initialization");
    return;
  }
  
  if (model && !ready) {
    console.log("AI Service: Model loading in progress...");
    return;
  }
  
  const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at: ${modelPath}`);
  }
  
  console.log("AI Service: Loading model from:", modelPath);
  console.log(`AI Service: GPU configuration - Enabled: ${GPU_ENABLED}, Layers: ${GPU_LAYERS || 'auto'}, VRAM Padding: ${VRAM_PADDING}MB`);
  
  llamaInstance = await getLlama({ 
    gpu: GPU_ENABLED,
    vramPadding: VRAM_PADDING,
    logger: GPU_ENABLED ? {
      log: (level, message) => console.log(`[Llama ${level}]`, message),
    } : undefined
  });
  
  model = await llamaInstance.loadModel({ 
    modelPath,
    gpuLayers: GPU_LAYERS
  });
  
  context = await model.createContext({
    threads: GPU_ENABLED ? 1 : 4, // Menos hilos para GPU
    contextSize: 4096,
  });
  
  session = new LlamaChatSession({ 
    contextSequence: context.getSequence(),
    autoDisposeSequence: false
  });
  
  console.log("AI Service: Model loaded and session initialized.");
  
  if (GPU_ENABLED) {
    console.log("🎯 GPU acceleration enabled for AI service!");
  }
  ready = true;
}

// Plugin initialization functions
async function getFunctionHandler(mode) {
  if (!functionsPlugin) return null;
  
  if (mode === 'prod') {
    if (!functionHandlerProd) {
      console.log("ROUTE FOR local_model_handler.mjs - GPU Config:", { gpu: GPU_ENABLED, gpuLayers: GPU_LAYERS, vramPadding: VRAM_PADDING });
      functionHandlerProd = await functionsPlugin.getLocalModelHandler({
        gpu: GPU_ENABLED,
        gpuLayers: GPU_LAYERS,
        vramPadding: VRAM_PADDING
      });
    }
    return functionHandlerProd;
  } else if (mode === 'dev') {
    if (!functionHandlerDev) {
       console.log("ROUTE FOR llama_functions_local.mjs - GPU Config:", { gpu: GPU_ENABLED, gpuLayers: GPU_LAYERS, vramPadding: VRAM_PADDING });
      const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
      functionHandlerDev = functionsPlugin.createLocalLlamaHandler(modelPath, ['fruits', 'system'], { 
        gpu: GPU_ENABLED,
        gpuLayers: GPU_LAYERS,
        vramPadding: VRAM_PADDING
      });
      await functionHandlerDev.initialize();
    }
    return functionHandlerDev;
  }
  
  return null;
}

app.post('/ai', async (req, res) => {
  console.log("Call /ai", req.body)
  try {
    console.log("AI Service: Processing request...");
    const userInput = String(req.body.input || '').trim();
    const userContext = req.body.context || '';
    const userPrompt = req.body.prompt || 'Provide an informative and precise response.';
    
    await initModel();
    console.log("AI Service: Model ready, generating response...");
    
    let snippets = [];
    if (userContext) {
        snippets = userContext.split('\n').slice(0, 50);
    }

    const prompt = [
      'Context: You are an AI assistant called "42" in Oasis, a distributed, encrypted and federated social network.',
      userContext ? `User Data:\n${userContext}` : '',
      `Query: "${userInput}"`,
      userPrompt
    ].filter(Boolean).join('\n\n');
    
    console.log("AI Service: Generating answer...");
    const answer = await session.prompt(prompt);
    console.log("AI Service: Answer generated successfully");
    res.json({ answer: String(answer || '').trim(), snippets });
  } catch (err) {
    lastError = err;
    console.error("AI Service Error:", err.message);
    res.status(500).json({ error: 'Internal Server Error', details: String(err.message || err) });
  }
});

app.post('/ai/train', async (req, res) => {
  res.json({ stored: true });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    ready: ready, 
    error: lastError?.message || null,
    timestamp: Date.now()
  });
});

app.get('/status', (req, res) => {
  res.json({ 
    status: ready ? 'ready' : 'initializing',
    modelLoaded: !!model,
    sessionReady: !!session,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.post('/preload', async (req, res) => {
  try {
    console.log("AI Service: Preloading model...");
    await initModel();
    res.json({ 
      status: 'success',
      ready: ready,
      message: 'Model preloaded successfully'
    });
  } catch (err) {
    console.error("AI Service: Error preloading model:", err.message);
    res.status(500).json({ 
      status: 'error',
      message: err.message 
    });
  }
});

console.log(`🤖 Servicio AI Standalone iniciado en puerto ${PORT}`);
console.log('📋 Endpoints disponibles:');
console.log('  POST /ai - Procesar consulta AI');
console.log('  GET /health - Estado del servicio');
console.log('  GET /status - Estado detallado');
console.log('  POST /preload - Precargar modelo');

// Precargar el modelo al inicio
console.log('🚀 Iniciando precarga del modelo...');
initModel().then(() => {
  console.log('✅ Modelo precargado exitosamente');
}).catch((err) => {
  console.error('❌ Error precargando modelo:', err.message);
});

app.listen(3011, () => {
  console.log('🤖 AI Service listening on port 3011');
}, err => {
  if (err) {
    console.error('❌ Error starting AI Service:', err.message);
  } else {
    console.log('✅ AI Service started successfully');
  }   
});