```bash
Call /ai {
  input: 'What is the current server status?',        
  llama_MCP_functions: true
}
🚀 AI Service: Iniciando modo 'llama_MCP_functions'!
🔧 AI Service: Solicitando handler para modo: llama_MCP_functions
🔧 AI Service: Creando handler MCP (llama_functions_mcp_handler.mjs)
🔧 AI Service: Registrando servidor MCP localhost:3003...
🏭 LLamaFunctionsMCPHandler: Iniciando creación con config: [
  'modelPath',
  'localFunctions',
  'mcpServers',
  'gpu',
  'gpuLayers',
  'vramPadding'
]
🏭 LLamaFunctionsMCPHandler: Creando instancia de LlamaFunctionMCPHandler...
🏭 LLamaFunctionsMCPHandler: Registrando 1 servidores MCP...
🔧 MCPMixin: Registrando 1 servidores MCP...
🔧 MCPMixin: Solicitando registro de servidor localhost en http://localhost:3003...
🔧 MCPMixin: Registrando servidor localhost en http://localhost:3003...
✅ Conectado a servidor MCP en: http://localhost:3003
✅ Servidor MCP registrado: localhost (20 tools)
🔍 Obteniendo información detallada del servidor localhost...
🔧 Ejecutando localhost.get_server_info con parámetros: {}
✅ Resultado de localhost.get_server_info: [
  {
    type: 'text',
    text: '{\n' +
      '  "name": "devops-mcp-server",\n' +
      '  "version": "1.0.0",\n' +
      '  "description": "devops-mcp-server MCP Server with enhanced capabilities",\n' +
      '  "capabilities": [\n' +
      '    "CRUD Operations (Prompts & Resources)",\n' +
      '    "Plugin System",\n' +
      '    "Web Console",\n' +
      '    "Health Monitoring",\n' +
      '    "Real-time Status"\n' +
      '  ],\n' +
      '  "endpoints": {\n' +
      '    "web": "http://localhost:3003",\n' +       
      '    "health": "http://localhost:3003/health",\n' +
      '    "status": "http://localhost:3003/status"\n' +
      '  },\n' +
      '  "runtime": {\n' +
      '    "platform": "win32",\n' +
      '    "nodeVersion": "v22.19.0",\n' +
      '    "pid": 4244\n' +
      '  },\n' +
      '  "timestamp": "2025-09-20T12:10:37.906Z"\n' + 
      '}'
  }
]
✅ Nombre real del servidor detectado: devops-mcp-server
✅ Servidor MCP devops-mcp-server registrado exitosamente
✅ MCPMixin: Servidor MCP localhost registrado exitosamente
✅ LLamaFunctionsMCPHandler: 1 servidores registrados, 0 errores
🏭 LLamaFunctionsMCPHandler: init...
🔧 LLamaFunctionsMCPHandler: Construyendo mapa de funciones combinadas...
🔧 Combined functions available: 20
🔧 LLamaFunctionsMCPHandler: Registradas 20 funciones antes de inicializar modelo
🔧 LLamaFunctionsMCPHandler: Llamando super.initialize() para modelo local...
Initializing local Llama model...
Model path: C:\Users\oracl\Documents\REPOS\oasis-features-lab-no-official\src\AI\models\oasis-42-1-chat.Q4_K_M.gguf
GPU enabled: true
GPU layers: auto
VRAM padding: 256MB
Loading model from: C:\Users\oracl\Documents\REPOS\oasis-features-lab-no-official\src\AI\models\oasis-42-1-chat.Q4_K_M.gguf
Creating context...
Creating chat session...
Local model initialized!
Using GPU: YES
Context size: 4096
Threads: auto
✅ Tokenizer working correctly
🎯 GPU acceleration enabled - model should run faster!
✅ LLamaFunctionsMCPHandler: Inicialización COMPLETADA exitosamente
✅ LLamaFunctionsMCPHandler: inited!
✅ AI Service: Handler MCP creado e inicializado exitosamente
📨 AI Service: Procesando input con handler llama_MCP_functions: "What is the current server status?"       

Prompt for local model: User asks: "What is the current server status?"

CRITICAL: You MUST call functions using the EXACT format: [[call: functionName({"param": "value"})]]        
CRITICAL: Do NOT explain or describe - just call the function directly!
CRITICAL: Use EXACT function names from the list below. NO explanations!

Available functions:
dms_list_prompts: Listar todos los prompts disponibles en el servidor
dms_add_prompt: Añadir un nuevo prompt al servidor    
dms_edit_prompt: Editar un prompt existente
dms_delete_prompt: Eliminar un prompt del servidor    
dms_get_prompt: Recuperar un prompt específico por ID 
dms_list_resources: Listar todos los recursos disponibles en el servidor
dms_add_resource: Añadir un nuevo recurso al servidor 
dms_edit_resource: Editar un recurso existente        
dms_delete_resource: Eliminar un recurso del servidor 
dms_get_resource: Recuperar un recurso específico por ID
dms_start_system: Arrancar el sistema usando npm start
dms_open_web_console: Abrir la consola web en el navegador
dms_get_server_status: Obtener el estado actual del servidor
dms_get_server_info: Obtener información detallada del servidor
dms_set_user_personality: Change UserSimulator personality and behavior
dms_simulate_user_decision: Simulate user consumption decision intelligently
dms_simulate_agent_selection: Select specific agent for next message
dms_control_simulator_mode: Enable/disable automatic UserSimulator mode
dms_get_simulator_status: Get current UserSimulator status and statistics
dms_analyze_game_context: Analyze current game state for intelligent decisions

REQUIRED FORMAT: [[call: functionName({"param": "value"})]]
NO explanations - ONLY function calls!

Examples:
User: "apple price?" → [[call: getFruitPrice({"name": "apple"})]]
User: "what time?" → [[call: getCurrentTime({})]]     
User: "server status?" → [[call: dms_get_server_status({})]]

User asks: "What is the current server status?"       
Your response (function call only):
Functions available: [
  'dms_list_prompts',
  'dms_add_prompt',
  'dms_edit_prompt',
  'dms_delete_prompt',
  'dms_get_prompt',
  'dms_list_resources',
  'dms_add_resource',
  'dms_edit_resource',
  'dms_delete_resource',
  'dms_get_resource',
  'dms_start_system',
  'dms_open_web_console',
  'dms_get_server_status',
  'dms_get_server_info',
  'dms_set_user_personality',
  'dms_simulate_user_decision',
  'dms_simulate_agent_selection',
  'dms_control_simulator_mode',
  'dms_get_simulator_status',
  'dms_analyze_game_context'
]
🔄 Starting model inference with functions...
Called generateContextState with local functions      
Generated context for local model
...........
✅ Model inference completed!

Local model raw response: dms_get_server_status({})   

🔍 Looking for function calls in: dms_get_server_status({})
Found function call: dms_get_server_status with params: {}
🔄 Routing MCP function dms_get_server_status
🔄 MCPMixin: Ejecutando función MCP dms_get_server_status -> get_server_status en devops-mcp-server
🔧 Ejecutando localhost.get_server_status con parámetros: {}
✅ Resultado de localhost.get_server_status: [
  {
    type: 'text',
    text: '{\n' +
      '  "server": "devops-mcp-server",\n' +
      '  "status": "running",\n' +
      '  "startTime": "2025-09-20T11:52:45.326Z",\n' +
      '  "uptime": {\n' +
      '    "milliseconds": 1076849,\n' +
      '    "formatted": "0h 17m 56s"\n' +
      '  },\n' +
      '  "port": 3003,\n' +
      '  "timestamp": "2025-09-20T12:10:42.175Z",\n' +
      '  "memory": {\n' +
      '    "used": "23 MB",\n' +
      '    "total": "26 MB"\n' +
      '  }\n' +
      '}'
  }
]
✅ MCPMixin: Función MCP dms_get_server_status ejecutada exitosamente
✅ MCP function dms_get_server_status executed successfully
✅ Function dms_get_server_status refactored!:        
🔍 Function processing complete. Had calls: true      

Processed with function results: [[result: {
  "server": "devops-mcp-server",
  "status": "running",
  "startTime": "2025-09-20T11:52:45.326Z",
  "uptime": {
    "milliseconds": 1076849,
    "formatted": "0h 17m 56s"
  },
  "port": 3003,
  "timestamp": "2025-09-20T12:10:42.175Z",
  "memory": {
    "used": "23 MB",
    "total": "26 MB"
  }
}]]
🔄 Starting natural response generation...
📝 Original query: What is the current server status? 
📊 Function results: [[result: { "server": "devops-mcp-server", "status": "running", "startTime": "2025-09-20T11:52:45.326Z", "uptime": { "milliseconds": 1076849, "formatted": "0h 17m 56s" }, "port": 3003, "timestamp": "2...
� Function results length: 311
📋 Raw result match: { "server": "devops-mcp-server", "status": "running", "startTime": "2025-09-20T11:52:45.326Z", "upti...
✅ Successfully parsed function data: object
📄 Parsed data keys: [
  'server',
  'status',
  'startTime',
  'uptime',
  'port',
  'timestamp',
  'memory'
]

🔧 Creating response prompt...
📝 Query: What is the current server status?
📊 Function data type: object
📄 Function data: {
  server: 'devops-mcp-server',
  status: 'running',
  startTime: '2025-09-20T11:52:45.326Z',
  uptime: { milliseconds: 1076849, formatted: '0h 17m 56s' },
  port: 3003,
  timestamp: '2025-09-20T12:10:42.175Z',
  memory: { used: '23 MB', total: '26 MB' }
}

🔍 Analyzing function data...
📊 Raw data: {
  server: 'devops-mcp-server',
  status: 'running',
  startTime: '2025-09-20T11:52:45.326Z',
  uptime: { milliseconds: 1076849, formatted: '0h 17m 56s' },
  port: 3003,
  timestamp: '2025-09-20T12:10:42.175Z',
  memory: { used: '23 MB', total: '26 MB' }
}
📈 Data type: object
🔑 Object keys: [
  'server',
  'status',
  'startTime',
  'uptime',
  'port',
  'timestamp',
  'memory'
]
📊 Analysis complete: {
  type: 'status',
  keyInfo: [
    'server/service details',
    'status information',
    'time/date information',
    'memory/resource usage'
  ],
  structure: 'object with 7 properties'
}
🔍 Data analysis result: {
  type: 'status',
  keyInfo: [
    'server/service details',
    'status information',
    'time/date information',
    'memory/resource usage'
  ],
  structure: 'object with 7 properties'
}
✅ Generated prompt successfully
🔄 Generating natural response with prompt (truncated for readability)
Called generateContextState with local functions      
Generated context for local model
🎯 Generated natural response: The current server status is running. The server has been running for 1076849 milliseconds, which is approximately 1 hour and 17 minutes. The server i...
📏 Response length: 209

✅ Natural response generated: The current server status is running. The server has been running for 1076849 milliseconds, which is approximately 1 hour and 17 minutes. The server is currently using 23 MB of memory, out of a total of 26 MB.
✅ AI Service: Respuesta generada con handler llama_MCP_functions

```

# DEPRECATED

```ts
oracle@ORACLE MINGW64 ~/Documents/REPOS/oasis-features-lab-no-official/src/AI (feature/mcp-erize)
$ npm run start:gpu
Debugger attached.

> oasis-ai-service@1.0.0 start:gpu
> start_gpu.bat

­ƒÄ» Starting Oasis AI Service with GPU optimization...
Debugger attached.
🚀 AI Service Configuration:
   GPU Enabled: YES
   GPU Layers: auto
   VRAM Padding: 256MB

🤖 Servicio AI Standalone iniciado en puerto 3011
📋 Endpoints disponibles:
  POST /ai - Procesar consulta AI
  GET /health - Estado del servicio
  GET /status - Estado detallado
  POST /preload - Precargar modelo
🚀 Iniciando precarga del modelo...
✅ Modelo precargado exitosamente
🚀 AI Service starting on port 3011
📍 Available modes:
  • Default: POST /ai {"input": "question"}
  • Functions Prod: POST /ai {"input": "question", "llama_MCP_functions": true}
  • Functions Prod: POST /ai {"input": "question", "node_llama_cpp_functions": true}
  • Functions Dev: POST /ai {"input": "question", "llama_functions": true}
  • No Functions: POST /ai {"input": "question", "useFunctions": false}
Call /ai { input: 'What is the current server status?', llama_MCP_functions: true }
Start /ai Plugins! { input: 'What is the current server status?', llama_MCP_functions: true }
ROUTE FOR llama_functions_handler.mjs




/*

    OASIS IA plugin connects and scans for tools on MPC server...

*/

✅ Conectado a servidor MCP en: http://localhost:3003
✅ Servidor MCP registrado: localhost (20 tools)
✅ Servidor MCP localhost registrado en handler híbrido
✅ Servidor MCP localhost registrado exitosamente
🔧 Combined functions available: 20
📋 Function names: localhost_list_prompts, localhost_add_prompt, localhost_edit_prompt, localhost_delete_prompt, localhost_get_prompt, localhost_list_resources, localhost_add_resource, localhost_edit_resource, localhost_delete_resource, localhost_get_resource, localhost_start_system, localhost_open_web_console, localhost_get_server_status, localhost_get_server_info, localhost_set_user_personality, localhost_simulate_user_decision, localhost_simulate_agent_selection, localhost_control_simulator_mode, localhost_get_simulator_status, localhost_analyze_game_context

/*

    OASIS IA plugin maps the tools to functions
    
*/

Local function registered: localhost_list_prompts
Local function registered: localhost_add_prompt
Local function registered: localhost_edit_prompt
Local function registered: localhost_delete_prompt
Local function registered: localhost_get_prompt
Local function registered: localhost_list_resources
Local function registered: localhost_add_resource
Local function registered: localhost_edit_resource
Local function registered: localhost_delete_resource
Local function registered: localhost_get_resource
Local function registered: localhost_start_system
Local function registered: localhost_open_web_console
Local function registered: localhost_get_server_status
Local function registered: localhost_get_server_info
Local function registered: localhost_set_user_personality
Local function registered: localhost_simulate_user_decision
Local function registered: localhost_simulate_agent_selection
Local function registered: localhost_control_simulator_mode
Local function registered: localhost_get_simulator_status
Local function registered: localhost_analyze_game_context

/*

    OASIS IA plugin NORMAL FLOW
    
*/

🔧 Registradas 20 funciones antes de inicializar modelo
Initializing local Llama model...
Model path: C:\Users\oracl\Documents\REPOS\oasis-features-lab-no-official\src\AI\models\oasis-42-1-chat.Q4_K_M.gguf
GPU enabled: true
GPU layers: auto
VRAM padding: 256MB
Loading model from: C:\Users\oracl\Documents\REPOS\oasis-features-lab-no-official\src\AI\models\oasis-42-1-chat.Q4_K_M.gguf
Creating context...
Creating chat session...
Local model initialized: C:\Users\oracl\Documents\REPOS\oasis-features-lab-no-official\src\AI\models\oasis-42-1-chat.Q4_K_M.gguf
Using GPU: YES
Context size: 4096
Threads: auto
✅ Tokenizer working correctly
🎯 GPU acceleration enabled - model should run faster!
// INDEED!!!!!! 
// at least 100x faster! 
// Queries run in seconds! 
// //even with double access to model (to select tools and to build final answer with tool results)


✅ Handler híbrido inicializado con modelo
🔧 Combined functions available: 20
✅ Handler híbrido inicializado con modelo


/*
    FROM UI WE GET A QUERY
*/



Start /ai Plugins! { input: 'What is the current server status?', llama_MCP_functions: true }
🔧 Combined functions available: 20
📋 Function names: localhost_list_prompts, localhost_add_prompt, localhost_edit_prompt, localhost_delete_prompt, localhost_get_prompt, localhost_list_resources, localhost_add_resource, localhost_edit_resource, localhost_delete_resource, localhost_get_resource, localhost_start_system, localhost_open_web_console, localhost_get_server_status, localhost_get_server_info, localhost_set_user_personality, localhost_simulate_user_decision, localhost_simulate_agent_selection, localhost_control_simulator_mode, localhost_get_simulator_status, localhost_analyze_game_context
🔧 Iniciando chat híbrido con 20 funciones disponibles

```
The prompt:

```

Prompt for local model: User asks: "What is the current server status?"

CRITICAL: You MUST use functions for specific information. Do NOT make up answers.
CRITICAL: Use EXACT function names from the list below. NO abbreviations or shortcuts!

Available functions:
- localhost_list_prompts: Listar todos los prompts disponibles en el servidor

- localhost_add_prompt: Añadir un nuevo prompt al servidor

- localhost_edit_prompt: Editar un prompt existente

- localhost_delete_prompt: Eliminar un prompt del servidor

- localhost_get_prompt: Recuperar un prompt específico por ID

- localhost_list_resources: Listar todos los recursos disponibles en el servidor

- localhost_add_resource: Añadir un nuevo recurso al servidor

- localhost_edit_resource: Editar un recurso existente

- localhost_delete_resource: Eliminar un recurso del servidor

- localhost_get_resource: Recuperar un recurso específico por ID

- localhost_start_system: Arrancar el sistema usando npm start

- localhost_open_web_console: Abrir la consola web en el navegador

- localhost_get_server_status: Obtener el estado actual del servidor

- localhost_get_server_info: Obtener información detallada del servidor

- localhost_set_user_personality: Change UserSimulator personality and behavior

- localhost_simulate_user_decision: Simulate user consumption decision intelligently

- localhost_simulate_agent_selection: Select specific agent for next message

- localhost_control_simulator_mode: Enable/disable automatic UserSimulator mode

- localhost_get_simulator_status: Get current UserSimulator status and statistics

- localhost_analyze_game_context: Analyze current game state for intelligent decisions


EXACT format required: [[call: functionName({"param": "value"})]]
WHERE functionName is EXACTLY one of the names listed above!

Examples:
User: "apple price?" → You: [[call: getFruitPrice({"name": "apple"})]]
User: "what time?" → You: [[call: getCurrentTime({})]]
User: "server status?" → You: [[call: localhost_get_server_status({})]]
User: "list prompts?" → You: [[call: localhost_list_prompts({})]]

For "What is the current server status?", find the matching function from the list and use its EXACT name:

```

Running:

```
🔄 Starting model inference with functions...
Called generateContextState with local functions
Generated context for local model
IA streams token [ 3492 ]
.IA streams token [ 29901 ]
.IA streams token [ 5519 ]
.IA streams token [ 4804 ]
.IA streams token [ 29901 ]
.IA streams token [ 15683 ]
.IA streams token [ 29918 ]
.IA streams token [ 657 ]
.IA streams token [ 29918 ]
.IA streams token [ 2974 ]
.IA streams token [ 29918 ]
.IA streams token [ 4882 ]
.IA streams token [ 3319 ]
.IA streams token [ 1800 ]
.IA streams token [ 5262 ]
.IA streams token []
.
✅ Model inference completed!

Local model raw response: You: [[call: localhost_get_server_status({})]]

🔍 Looking for function calls in: You: [[call: localhost_get_server_status({})]]

``` 

The model picked a function, now, back to oasis backend, we launch it towards de mcp server

```bash 

Found function call: localhost_get_server_status with params: {}
🔧 Ejecutando localhost.get_server_status con parámetros: {}
✅ Resultado de localhost.get_server_status: [
  {
    type: 'text',
    text: '{\n' +
      '  "server": "devops-mcp-server",\n' +
      '  "status": "running",\n' +
      '  "startTime": "2025-09-20T09:06:25.892Z",\n' +
      '  "uptime": {\n' +
      '    "milliseconds": 2093552,\n' +
      '    "formatted": "0h 34m 53s"\n' +
      '  },\n' +
      '  "port": 3003,\n' +
      '  "timestamp": "2025-09-20T09:41:19.444Z",\n' +
      '  "memory": {\n' +
      '    "used": "24 MB",\n' +
      '    "total": "26 MB"\n' +
      '  }\n' +
      '}'
  }
]
✅ Local function localhost_get_server_status called with params: {}
✅ Local function result: {
  success: true,
  result: '{\n' +
    '  "server": "devops-mcp-server",\n' +
    '  "status": "running",\n' +
    '  "startTime": "2025-09-20T09:06:25.892Z",\n' +
    '  "uptime": {\n' +
    '    "milliseconds": 2093552,\n' +
    '    "formatted": "0h 34m 53s"\n' +
    '  },\n' +
    '  "port": 3003,\n' +
    '  "timestamp": "2025-09-20T09:41:19.444Z",\n' +
    '  "memory": {\n' +
    '    "used": "24 MB",\n' +
    '    "total": "26 MB"\n' +
    '  }\n' +
    '}'
}
🔍 Function processing complete. Had calls: true

Processed with function results: You: [[result: {"success":true,"result":"{\n  \"server\": \"devops-mcp-server\",\n  \"status\": \"running\",\n  \"startTime\": \"2025-09-20T09:06:25.892Z\",\n  \"uptime\": {\n    \"milliseconds\": 2093552,\n    \"formatted\": \"0h 34m 53s\"\n  },\n  \"port\": 3003,\n  \"timestamp\": \"2025-09-20T09:41:19.444Z\",\n  \"memory\": {\n    \"used\": \"24 MB\",\n    \"total\": \"26 MB\"\n  }\n}"}]]

```

So now we have the results and need to go back to model and tell so it generates natural response:

```bash 
🔄 Generating natural response with prompt: You are an AI assistant helping a user understand information. The user asked: "What is the current server status?"

You received this data from a function call:
{
  "success": true,
  "result": "{\n  \"server\": \"devops-mcp-server\",\n  \"status\": \"running\",\n  \"startTime\": \"2025-09-20T09:06:25.892Z\",\n  \"uptime\": {\n    \"milliseconds\": 2093552,\n    \"formatted\": \"0h 34m 53s\"\n  },\n  \"port\": 3003,\n  \"timestamp\": \"2025-09-20T09:41:19.444Z\",\n  \"memory\": {\n    \"used\": \"24 MB\",\n    \"total\": \"26 MB\"\n  }\n}"
}

Data analysis:
- Data type: object
- Key information: success, result
- Structure: object with 2 properties

Instructions:
1. Provide a clear, conversational response that directly answers the user's question
2. Focus on the most relevant information from the data
3. Use natural language - avoid technical jargon or mentioning "function calls"
4. If the data contains multiple items, organize your response logically
5. Be concise but informative
6. If there are numbers, dates, or technical details, explain them in context

Respond naturally as if you're explaining this information to a colleague:
Called generateContextState with local functions
Generated context for local model
```

Final:

```bash
✅ Natural response generated: You: The current server status is "running" with 2093552 milliseconds of uptime, using 24 MB of memory, and running on port 3003. The server is currently live with a timestamp of "2025-09-20T09:41:19.444Z".
```



