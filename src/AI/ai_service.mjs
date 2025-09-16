import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

// Plugin imports - solo si están disponibles
let functionsPlugin = null;
try {
  const { createLocalLlamaHandler } = await import('./plugins/llama_functions_local.mjs');
  const { getLocalModelHandler } = await import('./plugins/local_model_handler.mjs');
  functionsPlugin = { createLocalLlamaHandler, getLocalModelHandler };
} catch (error) {
  console.log('Functions plugin not available, running in basic mode');
}

let getConfig, buildAIContext;
try {
  getConfig = (await import('../configs/config-manager.js')).getConfig;
} catch {}

try {
  const mod = await import('./buildAIContext.js');
  buildAIContext = mod.default || mod.buildContext;
} catch {}

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
  if (model) return;
  const modelPath = path.join(__dirname, 'oasis-42-1-chat.Q4_K_M.gguf');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at: ${modelPath}`);
  }
  llamaInstance = await getLlama({ gpu: false });
  model = await llamaInstance.loadModel({ modelPath });
  context = await model.createContext();
  session = new LlamaChatSession({ contextSequence: context.getSequence() });
  ready = true;
}

// Plugin initialization functions
async function getFunctionHandler(mode) {
  if (!functionsPlugin) return null;
  
  if (mode === 'prod') {
    if (!functionHandlerProd) {
      functionHandlerProd = await functionsPlugin.getLocalModelHandler();
    }
    return functionHandlerProd;
  } else if (mode === 'dev') {
    if (!functionHandlerDev) {
      const modelPath = path.join(__dirname, 'oasis-42-1-chat.Q4_K_M.gguf');
      functionHandlerDev = functionsPlugin.createLocalLlamaHandler(modelPath, ['fruits', 'system'], { gpu: false });
      await functionHandlerDev.initialize();
    }
    return functionHandlerDev;
  }
  
  return null;
}

app.post('/ai', async (req, res) => {
  console.log("Call /ai", req.body)
  try {
    const userInput = String(req.body.input || '').trim();
    
    // Detectar modo de funciones desde request o config
    const functionMode = req.body.functionMode || 
                        (req.body.useFunctionsProd ? 'prod' : 
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
          userContext = await (buildAIContext ? buildAIContext(120) : '');
        } catch(err) {
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

    // Fallback: modo original sin funciones
    await initModel();

    let userContext = '';
    let snippets = [];
    try {
      userContext = await (buildAIContext ? buildAIContext(120) : '');
      if (userContext) {
        snippets = userContext.split('\n').slice(0, 50);
      }
    } catch {}

    const config = getConfig?.() || {};
    const userPrompt = config.ai?.prompt?.trim() || 'Provide an informative and precise response.';

    const prompt = [
      'Context: You are an AI assistant called "42" in Oasis, a distributed, encrypted and federated social network.',
      userContext ? `User Data:\n${userContext}` : '',
      `Query: "${userInput}"`,
      userPrompt
    ].filter(Boolean).join('\n\n');
    
    const answer = await session.prompt(prompt);
    res.json({ 
      answer: String(answer || '').trim(), 
      snippets,
      mode: 'legacy'
    });
  } catch (err) {
    lastError = err;
    res.status(500).json({ error: 'Internal Server Error', details: String(err.message || err) });
  }
});

app.post('/ai/train', async (req, res) => {
  res.json({ stored: true });
});



app.listen(4001, () => {
  console.log('🚀 AI Service starting on port 4001');
  console.log('📍 Available modes:');
  console.log('  • Default: POST /ai {"input": "question"}');
  console.log('  • Functions Prod: POST /ai {"input": "question", "useFunctionsProd": true}');
  console.log('  • Functions Dev: POST /ai {"input": "question", "useFunctionsDev": true}');
  console.log('  • No Functions: POST /ai {"input": "question", "useFunctions": false}');
  if (!functionsPlugin) {
    console.log('⚠️  Functions plugin not loaded - only legacy mode available');
  }
}).on('error', (err) => {
  console.error('❌ Failed to start AI Service:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('Port 4001 is already in use');
  }
  process.exit(1);
});

