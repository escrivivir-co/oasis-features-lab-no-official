import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

// ✅ Configuración standalone - puerto independiente
const PORT = process.env.PORT || 4001;

// ✅ GPU Configuration from environment variables
const GPU_ENABLED = process.env.GPU_ENABLED === 'true' || process.env.GPU_ENABLED === '1';
const GPU_LAYERS = process.env.GPU_LAYERS === 'auto' ? undefined : (process.env.GPU_LAYERS ? parseInt(process.env.GPU_LAYERS) : undefined);
const VRAM_PADDING = process.env.VRAM_PADDING ? parseInt(process.env.VRAM_PADDING) : (GPU_ENABLED ? 256 : 64);

console.log('🚀 AI Service Standalone Configuration:');
console.log(`   Puerto: ${PORT}`);
console.log(`   GPU Enabled: ${GPU_ENABLED ? 'YES' : 'NO'}`);
console.log(`   GPU Layers: ${GPU_LAYERS || 'auto'}`);
console.log(`   VRAM Padding: ${VRAM_PADDING}MB`);
console.log('');

// Plugin imports - solo si están disponibles
let functionsPlugin = null;
try {
  const { getLLamaFunctionsHandler } = await import('./plugins/llama_functions/llama_functions_handler.mjs');
  const { getLLamaFunctionsMCPHandler, LLAMA_FUNCTIONS_PRESETS } = await import('./plugins/llama_functions/llama_functions_mcp_handler.mjs');
  const { getNodeLlamaCppHandler } = await import('./plugins/node_llama_cpp_functions/node_llama_cpp_handler.mjs');
  const { getNodeLlamaCppMCPHandler } = await import('./plugins/node_llama_cpp_functions/node_llama_cpp_mcp_handler.mjs');
  functionsPlugin = { getLLamaFunctionsHandler, getNodeLlamaCppHandler, getLLamaFunctionsMCPHandler, getNodeLlamaCppMCPHandler, LLAMA_FUNCTIONS_PRESETS };
  console.log('✅ Functions plugin loaded successfully');
} catch (error) {
  console.log('⚠️ Functions plugin not available, running in basic mode');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentar límite para contexto grande

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables del sistema AI
let llamaInstance, model, context, session;
let ready = false;
let lastError = null;

// Plugin handlers - inicializados cuando se necesiten
let functionHandlerProd = null;
let functionHandlerDev = null;
let functionHandlerMcp = null; // Manual implementation (hybrid)
let functionHandlerMcpNative = null; // Native node-llama-cpp implementation

// ✅ Inicialización del modelo (modo legacy sin funciones)
async function initModel() {
  if (ready) {
    console.log("AI Service Standalone: Model already loaded, skipping initialization");
    return;
  }

  const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at: ${modelPath}`);
  }

  console.log("AI Service Standalone: Loading model from:", modelPath);
  console.log(`AI Service Standalone: GPU configuration - Enabled: ${GPU_ENABLED}, Layers: ${GPU_LAYERS || 'auto'}, VRAM Padding: ${VRAM_PADDING}MB`);

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

  console.log("AI Service Standalone: Model loaded and session initialized.");

  if (GPU_ENABLED) {
    console.log("🎯 GPU acceleration enabled for AI standalone service!");
  }
  ready = true;
}

// ✅ Plugin initialization functions
async function getFunctionHandler(mode) {
  if (!functionsPlugin) return null;

  console.log(`🔧 AI Service Standalone: Solicitando handler para modo: ${mode}`);
  const modelPath = path.join(__dirname, 'models', 'oasis-42-1-chat.Q4_K_M.gguf');
  
  switch (mode) {
    case 'node_llama_cpp_functions': {
      if (!functionHandlerProd) {
        console.log("🔧 AI Service Standalone: Creando handler PROD (node_llama_cpp_handler.mjs)");
        functionHandlerProd = await functionsPlugin.getNodeLlamaCppHandler({
          modelPath,
          functionSets: ['fruits', 'system'],
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("✅ AI Service Standalone: Handler PROD creado exitosamente");
      } else {
        console.log("♻️ AI Service Standalone: Reutilizando handler PROD existente");
      }
      return functionHandlerProd;
    }
    case 'llama_functions': {
      if (!functionHandlerDev) {
        console.log("🔧 AI Service Standalone: Creando handler DEV (llama_functions_handler.mjs)");
        functionHandlerDev = await functionsPlugin.getLLamaFunctionsHandler(modelPath, ['fruits', 'system'], {
          gpu: GPU_ENABLED,
          gpuLayers: GPU_LAYERS,
          vramPadding: VRAM_PADDING
        });
        console.log("🔧 AI Service Standalone: Inicializando handler DEV...");
        await functionHandlerDev.initialize();
        console.log("✅ AI Service Standalone: Handler DEV creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service Standalone: Reutilizando handler DEV existente");
      }
      return functionHandlerDev;
    }
    case 'llama_MCP_functions': {
      if (!functionHandlerMcp) {
        console.log("🔧 AI Service Standalone: Creando handler MCP (llama_functions_mcp_handler.mjs)");
        console.log("🔧 AI Service Standalone: Registrando servidor MCP localhost:3003...");
        
        // ⚠️ CRÍTICO: getLLamaFunctionsMCPHandler YA inicializa el handler internamente
        // NO llamar initialize() después o se duplicará la inicialización
        functionHandlerMcp = await functionsPlugin.getLLamaFunctionsMCPHandler({
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
        console.log("✅ AI Service Standalone: Handler MCP creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service Standalone: Reutilizando handler MCP existente");
      }
      return functionHandlerMcp;
    }
    case 'node_llama_cpp_MCP_functions': {
      if (!functionHandlerMcpNative) {
        console.log("🔧 AI Service Standalone: Creando handler MCP Native (node_llama_cpp_mcp_handler.mjs)");
        console.log("🔧 AI Service Standalone: Usando node-llama-cpp nativo para funciones MCP...");
        
        functionHandlerMcpNative = await functionsPlugin.getNodeLlamaCppMCPHandler({
          modelPath,
          functionSets: ['fruits', 'system'],
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
        console.log("✅ AI Service Standalone: Handler MCP Native creado e inicializado exitosamente");
      } else {
        console.log("♻️ AI Service Standalone: Reutilizando handler MCP Native existente");
      }
      return functionHandlerMcpNative;
    }
    default : {
      console.log(`❌ AI Service Standalone: Modo '${mode}' no reconocido`);
    }
  }

  return null;
}

// ✅ ENDPOINT PRINCIPAL /ai - Standalone version
app.post('/ai', async (req, res) => {
  console.log("AI Service Standalone: Received /ai request", {
    hasInput: !!req.body.input,
    hasContext: !!req.body.context,
    functionMode: req.body.functionMode || 'none'
  });
  
  try {
    const userInput = String(req.body.input || '').trim();
    
    if (!userInput) {
      return res.status(400).json({ error: 'No input provided' });
    }

    // Detectar modo de funciones desde request
    const functionMode = req.body.functionMode ||
      (req.body.llama_MCP_functions ? 'llama_MCP_functions' :
        req.body.node_llama_cpp_MCP_functions ? 'node_llama_cpp_MCP_functions' :
        req.body.node_llama_cpp_functions ? 'node_llama_cpp_functions' :
        req.body.llama_functions ? 'llama_functions' :
          req.body.useFunctions === false ? 'none' :
            'none'); // Por defecto sin funciones para compatibilidad

    // ✅ El contexto ya viene procesado desde backend.js
    const userContext = req.body.context || '';
    const userPrompt = req.body.prompt || 'Provide an informative and precise response.';

    console.log(`📊 AI Service Standalone: Procesando en modo '${functionMode}'`);
    console.log(`📊 Contexto recibido: ${userContext.length} caracteres`);

    // Si hay modo de funciones disponible, usar el plugin
    if (functionMode !== 'none' && functionsPlugin) {
      console.log(`🚀 AI Service Standalone: Iniciando modo '${functionMode}'!`);
      const handler = await getFunctionHandler(functionMode);
      if (handler) {
        console.log(`📨 AI Service Standalone: Procesando input con handler ${functionMode}: "${userInput}"`);
        const result = await handler.chat(userInput, userContext);
        console.log(`✅ AI Service Standalone: Respuesta generada con handler ${functionMode}`);

        return res.json({
          answer: result.answer || result,
          snippets: userContext ? userContext.split('\n').slice(0, 50) : [],
          hadFunctionCalls: result.hadFunctionCalls || false,
          mode: functionMode
        });
      } else {
        console.log(`❌ AI Service Standalone: No se pudo obtener handler para modo '${functionMode}', fallback a legacy`);
      }
    }

    // ✅ Fallback: modo legacy con session
    console.log("AI Service Standalone: Processing request in legacy mode...");
    await initModel();

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

    console.log("AI Service Standalone: Generating answer...");
    const answer = await session.prompt(prompt);
    console.log("AI Service Standalone: Answer generated successfully");
    
    res.json({
      answer: String(answer || '').trim(),
      snippets,
      mode: 'legacy'
    });
  } catch (err) {
    lastError = err;
    console.error("AI Service Standalone Error:", err.message);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: String(err.message || err) 
    });
  }
});

// ✅ ENDPOINT /health - Verificación de estado
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ready: ready,
    service: 'standalone',
    port: PORT,
    error: lastError?.message || null,
    timestamp: Date.now()
  });
});

// ✅ ENDPOINT /status - Estado detallado
app.get('/status', (req, res) => {
  res.json({
    status: ready ? 'ready' : 'initializing',
    service: 'standalone',
    port: PORT,
    modelLoaded: !!model,
    sessionReady: !!session,
    gpu: GPU_ENABLED,
    functionsAvailable: !!functionsPlugin,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ ENDPOINT /preload - Precarga del modelo
app.post('/preload', async (req, res) => {
  try {
    console.log("AI Service Standalone: Preloading model...");
    await initModel();
    res.json({
      status: 'success',
      ready: ready,
      service: 'standalone',
      message: 'Model preloaded successfully'
    });
  } catch (err) {
    console.error("AI Service Standalone: Error preloading model:", err.message);
    res.status(500).json({
      status: 'error',
      service: 'standalone',
      message: err.message
    });
  }
});

// ✅ ENDPOINT /shutdown - Apagado controlado (opcional para desarrollo)
app.post('/shutdown', (req, res) => {
  console.log('AI Service Standalone: Shutdown requested');
  res.json({ status: 'shutting down' });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

console.log(`🤖 Servicio AI Standalone iniciado en puerto ${PORT}`);
console.log('📋 Endpoints disponibles:');
console.log('  POST /ai - Procesar consulta AI');
console.log('  GET /health - Estado del servicio');
console.log('  GET /status - Estado detallado');
console.log('  POST /preload - Precargar modelo');
console.log('  POST /shutdown - Apagar servicio');

// ✅ Manejo de errores de inicio
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Service Standalone listening on port ${PORT}`);
  console.log('📍 Available modes:');
  console.log('  • Default: POST /ai {"input": "question", "context": "..."}');
  console.log('  • Functions MCP Manual: POST /ai {"input": "question", "llama_MCP_functions": true}');
  console.log('  • Functions MCP Native: POST /ai {"input": "question", "node_llama_cpp_MCP_functions": true}');
  console.log('  • Functions Prod: POST /ai {"input": "question", "node_llama_cpp_functions": true}');
  console.log('  • Functions Dev: POST /ai {"input": "question", "llama_functions": true}');
  console.log('  • No Functions: POST /ai {"input": "question", "useFunctions": false}');
  if (!functionsPlugin) {
    console.log('⚠️  Functions plugin not loaded - only legacy mode available');
  }
}).on('error', (err) => {
  console.error('❌ Failed to start AI Service Standalone:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// ✅ Manejo de señales para apagado limpio
process.on('SIGINT', () => {
  console.log('AI Service Standalone: Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('AI Service Standalone: Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});