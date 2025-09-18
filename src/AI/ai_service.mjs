import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from '../server/node_modules/express/index.js';
import cors from '../server/node_modules/cors/lib/index.js';
import { getLlama, LlamaChatSession } from '../server/node_modules/node-llama-cpp/dist/index.js';

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let llamaInstance, model, context, session;
let ready = false;
let lastError = null;

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
  llamaInstance = await getLlama({ gpu: false });
  model = await llamaInstance.loadModel({ modelPath });
  context = await model.createContext();
  session = new LlamaChatSession({ contextSequence: context.getSequence() });
  console.log("AI Service: Model loaded and session initialized.");
  ready = true;
}

app.post('/ai', async (req, res) => {
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

console.log('🤖 Servicio AI Standalone iniciado en puerto 4001');
console.log('📋 Endpoints disponibles:');
console.log('  POST /ai - Procesar consulta AI');
console.log('  GET /health - Estado del servicio');
console.log('  GET /status - Estado detallado');
console.log('  POST /preload - Precargar modelo');

// Precargar el modelo al inicio
/* console.log('🚀 Iniciando precarga del modelo...');
initModel().then(() => {
  console.log('✅ Modelo precargado exitosamente');
}).catch((err) => {
  console.error('❌ Error precargando modelo:', err.message);
}); */

app.listen(4001);