import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const PORT = process.env.PORT || 3011;

// ✅ GPU Configuration from environment variables
const GPU_ENABLED = process.env.GPU_ENABLED === 'true' || process.env.GPU_ENABLED === '1';
const GPU_LAYERS = process.env.GPU_LAYERS === 'auto' ? undefined : (process.env.GPU_LAYERS ? parseInt(process.env.GPU_LAYERS) : undefined);
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
  const { createHybridHandler, HYBRID_PRESETS } = await import('./plugins/hybrid_llama_handler.mjs');
  functionsPlugin = { createLocalLlamaHandler, getLocalModelHandler, createHybridHandler, HYBRID_PRESETS };
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
let functionHandlerMcp = null; // Single shared handler

async function initModel() {
  if (ready) {
    console.log("AI Service: Model already loaded, skipping initialization");
    return;
  }

  // Fallback to legacy mode if no functions plugin
  if (!functionsPlugin) {
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
}

// Plugin initialization functions
async function getFunctionHandler(mode) {
  if (!functionsPlugin) return null;

  console.log("ROUTE FOR llama_functions_local.mjs")
  const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
  switch (mode) {
    case 'prod': {
      if (!functionHandlerProd) {
        console.log("ROUTE FOR local_model_handler.mjs")
        functionHandlerProd = await functionsPlugin.getLocalModelHandler({
          modelPath,
          functionSets: ['fruits', 'system'],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
      }
      return functionHandlerProd;
    }
    case 'dev': {
      if (!functionHandlerDev) {
        functionHandlerDev = await functionsPlugin.createLocalLlamaHandler(modelPath, ['fruits', 'system'], {
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        await functionHandlerDev.initialize();
      }
      return functionHandlerDev;
    }
    case 'mcp': {
      if (!functionHandlerMcp) {
        functionHandlerMcp = await functionsPlugin.createHybridHandler({
          modelPath,
          localFunctions: ['fruits', 'system'],
          mcpServers: [
            {
              name: 'localhost',
              url: 'http://localhost:3003',
              transport: 'http'
            }
          ],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        await functionHandlerMcp.initialize();
      }
      return functionHandlerMcp;
    }
    default : {
      console.log("No handler found!!!!!")
    }
  }

  return null;
}

app.post('/ai', async (req, res) => {
  console.log("Call /ai", req.body)
  try {
    const userInput = String(req.body.input || '').trim();

    // Detectar modo de funciones desde request o config
    const functionMode = req.body.functionMode ||
      (req.body.useFunctionsMcp ? 'mcp' :
        req.body.useFunctionsProd ? 'prod' :
        req.body.useFunctionsDev ? 'dev' :
          req.body.useFunctions === false ? 'none' :
            'none'); // Por defecto sin funciones para compatibilidad

    // Si hay modo de funciones disponible, usar el plugin
    if (functionMode !== 'none' && functionsPlugin) {
      console.log("Start /ai Plugins!", req.body)
      const handler = await getFunctionHandler(functionMode);
      if (handler) {
        let userContext = '';
        try {
          userContext = req.body.context || '';
        } catch (err) {
          console.log("Error at route /ai", err.message)
        }

        console.log("Start /ai Plugins!", req.body)
        const result = await handler.chat(userInput, userContext);

        return res.json({
          answer: result.answer || result,
          snippets: userContext ? userContext.split('\n').slice(0, 50) : [],
          hadFunctionCalls: result.hadFunctionCalls || false,
          mode: functionMode
        });
      }
    }

    // Fallback: use shared handler or legacy mode
    console.log("AI Service: Processing request in fallback mode...");
    const userContext = req.body.context || '';

    // Try to use shared handler first
    if (mainHandler) {
      console.log("AI Service: Using shared model handler...");
      const result = await mainHandler.chat(userInput, userContext);
      return res.json({
        answer: result.answer || result,
        snippets: userContext ? userContext.split('\n').slice(0, 50) : [],
        hadFunctionCalls: result.hadFunctionCalls || false,
        mode: 'shared'
      });
    }

    // Ultimate fallback: legacy mode with session
    await initModel();
    console.log("AI Service: Using legacy session mode...");
    const userPrompt = req.body.prompt || 'Provide an informative and precise response.';

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
    res.json({
      answer: String(answer || '').trim(),
      snippets,
      mode: 'legacy'
    });
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

app.listen(PORT, () => {
  console.log(`🚀 AI Service starting on port ${PORT}`);
  console.log('📍 Available modes:');
  console.log('  • Default: POST /ai {"input": "question"}');
  console.log('  • Functions Prod: POST /ai {"input": "question", "useFunctionsMcp": true}');
  console.log('  • Functions Prod: POST /ai {"input": "question", "useFunctionsProd": true}');
  console.log('  • Functions Dev: POST /ai {"input": "question", "useFunctionsDev": true}');
  console.log('  • No Functions: POST /ai {"input": "question", "useFunctions": false}');
  if (!functionsPlugin) {
    console.log('⚠️  Functions plugin not loaded - only legacy mode available');
  }
}).on('error', (err) => {
  console.error('❌ Failed to start AI Service:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});