import { LlamaFunctionHandler, LLAMA_FUNCTION_CONFIGS } from './llama_functions_handler.mjs';
import { MCPMixin } from '../mcp/MCPMixin.mjs';

/**
 * Handler híbrido que combina funciones locales con funciones MCP
 */
export class LlamaFunctionMCPHandler extends LlamaFunctionHandler {
  constructor(config = {}) {
    super(config);
    
    // Aplicar MCPMixin
    Object.assign(this, new MCPMixin());
    
    this.functionsCache = null; // Cache para evitar recalcular funciones
  }

  /**
   * Inicializar el handler híbrido con todas las funciones
   */
  async initialize() {
    console.log('🔧 HybridHandler: INICIANDO inicialización...');
    
    // Verificar si ya está inicializado
    if (this.ready) {
      console.log('✅ HybridHandler: Ya estaba inicializado, omitiendo...');
      return;
    }
    
    // Construir y cachear todas las funciones combinadas ANTES de inicializar el modelo
    console.log('🔧 HybridHandler: Construyendo mapa de funciones combinadas...');
    this.functionsCache = this._buildCombinedFunctions();
    
    // Limpiar funciones existentes y registrar todas las funciones
    this.functions.clear();
    
    // Registrar cada función individualmente en el handler local
    for (const [name, functionDef] of Object.entries(this.functionsCache)) {
      this.registerFunction(name, functionDef);
    }
    
    console.log(`🔧 HybridHandler: Registradas ${Object.keys(this.functionsCache).length} funciones antes de inicializar modelo`);
    
    // Luego inicializar el modelo con todas las funciones registradas
    console.log('🔧 HybridHandler: Llamando super.initialize() para modelo local...');
    await super.initialize();
    
    console.log('✅ HybridHandler: Inicialización COMPLETADA exitosamente');
  }

  /**
   * Invalidar cache cuando se registran nuevos servidores
   */
  async registerMCPServer(serverName, serverConfig, transportType = 'http') {
    const result = await super.registerMCPServer(serverName, serverConfig, transportType);
    
    // Invalidar cache de funciones para que se recalcule en la próxima inicialización
    this.functionsCache = null;
    
    return result;
  }

  /**
   * Construir mapa combinado de funciones (solo se ejecuta una vez)
   */
  _buildCombinedFunctions() {
    // Empezar con funciones locales
    const localFunctions = super.getFunctionsForNodeLlama();
    
    // Añadir funciones MCP usando el mixin
    const mcpFunctionMap = this._buildMCPFunctionMapping();
    
    // Combinar ambos tipos
    const allFunctions = { ...localFunctions, ...mcpFunctionMap };
    
    console.log(`🔧 Combined functions available: ${Object.keys(allFunctions).length}`);
    console.log(`📋 Function names: ${Object.keys(allFunctions).join(', ')}`);
    
    return allFunctions;
  }

  /**
   * Obtener todas las funciones (locales + MCP) para node-llama-cpp
   * OPTIMIZADO: Usa cache en lugar de recalcular
   */
  getFunctionsForNodeLlama() {
    // Si ya tenemos el cache construido, usarlo
    if (this.functionsCache) {
      return this.functionsCache;
    }
    
    // Si no hay cache, construirlo (esto solo debería pasar durante la inicialización)
    console.log('⚠️ Reconstruyendo mapa de funciones (debería ser raro)');
    return this._buildCombinedFunctions();
  }

  /**
   * Registrar funciones locales y MCP desde configuración
   */
  async registerAllFunctions(localFunctionSets = [], mcpServers = []) {
    // Registrar funciones locales
    if (localFunctionSets.length > 0) {
      localFunctionSets.forEach(setName => {
        if (LLAMA_FUNCTION_CONFIGS[setName]) {
          this.registerFunctions({ [setName]: LLAMA_FUNCTION_CONFIGS[setName] });
          console.log(`✅ Funciones locales registradas: ${setName}`);
        } else {
          console.warn(`⚠️ Set de funciones desconocido: ${setName}`);
        }
      });
    }

    // Registrar servidores MCP usando el mixin
    const mcpResult = await this.registerMCPServers(mcpServers);

    return {
      local: localFunctionSets.length,
      mcp: mcpResult.registered,
      mcpErrors: mcpResult.errors
    };
  }

  /**
   * Obtener estadísticas de funciones registradas
   */
  getFunctionStats() {
    const localFunctions = super.getRegisteredFunctions();
    const mcpStats = this.getMCPStats();

    return {
      local: {
        count: Object.keys(localFunctions).length,
        functions: Object.keys(localFunctions)
      },
      mcp: mcpStats,
      total: Object.keys(localFunctions).length + mcpStats.count
    };
  }

  /**
   * Chat con funciones híbridas (locales + MCP) - con prompt optimizado
   */
  async chat(userInput, systemContext = "") {
    if (!this.ready) {
      await this.initialize();
    }

    // Verificar que la sesión esté disponible
    if (!this.session) {
      throw new Error("Chat session not initialized");
    }

    this.wrapper.userContext = systemContext;

    // Generar ejemplos dinámicos basados en las funciones disponibles
    const availableFunctions = this.getRegisteredFunctions();
    const dynamicExamples = this._generateDynamicExamples(availableFunctions, userInput);

    const prompt = [
      `User asks: "${userInput}"`,
      "",
      'CRITICAL: You MUST call functions using the EXACT format: [[call: functionName({"param": "value"})]]',
      "CRITICAL: Do NOT explain or describe - just call the function directly!",
      "CRITICAL: Use EXACT function names from the list below. NO explanations!",
      "",
      "Available functions:",
      ...availableFunctions.map(
        (f) => `${f.name}: ${f.description}`
      ),
      "",
      'REQUIRED FORMAT: [[call: functionName({"param": "value"})]]',
      'NO explanations - ONLY function calls!',
      "",
      "Examples:",
      'User: "apple price?" → [[call: getFruitPrice({"name": "apple"})]]',
      'User: "what time?" → [[call: getCurrentTime({})]]',
      'User: "server status?" → [[call: dms_get_server_status({})]]',
      "",
      `User asks: "${userInput}"`,
      "Your response (function call only):",
    ].join("\n");

    console.log("\nPrompt for local model:", prompt);

    const functions = this.getFunctionsForNodeLlama();
    console.log("Functions available:", Object.keys(functions));

    try {
      // Test simple primero si no hay funciones
      if (Object.keys(functions).length === 0) {
        console.log("🔄 Starting simple inference (no functions)...");
        const result = await this.session.prompt(userInput, {
          maxTokens: 100,
          temperature: 0.7,
        });
        return {
          answer: String(result || "").trim(),
          hadFunctionCalls: false,
        };
      }

      // Con funciones - usar timeout más corto
      console.log("🔄 Starting model inference with functions...");
      const timer = 5 * 60 * 1000; // 5 minutos
      const answer = await Promise.race([
        this.session.prompt(prompt, {
          maxTokens: 150, // Limitar tokens para evitar respuestas muy largas
          temperature: 0.7,
          topP: 0.9,
          onToken: (token) => {
            // Log progreso de tokens (opcional)
            process.stdout.write(".");
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Model inference timeout: ${timer / 1000}s`)),
            timer
          )
        ),
      ]);

      console.log("\n✅ Model inference completed!");
      console.log("\nLocal model raw response:", answer);

      // Buscar y procesar llamadas a funciones manualmente
      const processedAnswer = await this.processFunctionCalls(answer);
      let hadFunctionCalls = processedAnswer !== answer;

      // Si hubo funciones, hacer segunda llamada para respuesta natural
      let finalAnswer = processedAnswer;
      if (hadFunctionCalls) {
        console.log("\nProcessed with function results:", processedAnswer);

        // Generar respuesta natural usando el modelo
        finalAnswer = await this.generateNaturalResponse(userInput, processedAnswer);
        console.log("\n✅ Natural response generated:", finalAnswer);
      }

      return {
        answer: String(finalAnswer || "").trim(),
        hadFunctionCalls,
      };

    } catch (error) {
      console.error("❌ Error in chat:", error.message);
      throw error;
    }
  }

  /**
   * Generar ejemplos dinámicos basados en las funciones disponibles
   */
  _generateDynamicExamples(availableFunctions, userInput) {
    const examples = [];
    
    // Buscar funciones relacionadas con la consulta del usuario
    const queryLower = userInput.toLowerCase();
    
    // Ejemplos básicos siempre presentes
    const basicExamples = [
      'User: "apple price?" → You: [[call: getFruitPrice({"name": "apple"})]]',
      'User: "what time?" → You: [[call: getCurrentTime({})]]'
    ];
    
    // Agregar ejemplos específicos basados en funciones disponibles
    for (const func of availableFunctions) {
      const funcName = func.name;
      
      if (funcName.includes('get_server_status') && queryLower.includes('status')) {
        examples.push(`User: "server status?" → You: [[call: ${funcName}({})]]`);
      } else if (funcName.includes('list_prompts') && queryLower.includes('list')) {
        examples.push(`User: "list prompts?" → You: [[call: ${funcName}({})]]`);
      } else if (funcName.includes('get_server_info') && queryLower.includes('info')) {
        examples.push(`User: "server info?" → You: [[call: ${funcName}({})]]`);
      }
      
      // Solo agregar los primeros 2-3 ejemplos específicos para no saturar
      if (examples.length >= 3) break;
    }
    
    // Si no encontramos ejemplos específicos, usar uno genérico
    if (examples.length === 0) {
      const firstMcpFunction = availableFunctions.find(f => f.name.includes('_'));
      if (firstMcpFunction) {
        examples.push(`User: "need info?" → You: [[call: ${firstMcpFunction.name}({})]]`);
      }
    }
    
    // Combinar ejemplos básicos con específicos
    return [...basicExamples, ...examples];
  }

  /**
   * Procesar llamadas a funciones con routing inteligente MCP vs Local
   */
  async processFunctionCalls(text) {
    console.log("\n🔍 Looking for function calls in:", text);

    // Regex más flexible para capturar diferentes formatos
    const functionCallRegex = /(?:\[\[call:\s*|\b)(\w+)\s*\(\s*(\{[^}]*\}|\{\}|)\s*\)/g;
    let processedText = text;
    let match;
    let hadAnyFunctionCalls = false;

    // Buscar el formato correcto [[call: ...]] o simplemente functionName({})
    while ((match = functionCallRegex.exec(text)) !== null) {
      const [fullMatch, functionName, paramsStr] = match;
      console.log(
        `Found function call: ${functionName} with params: ${paramsStr}`
      );

      // Verificar que es una función válida registrada
      if (!this.isMCPFunction(functionName) && !this.functions.has(functionName)) {
        console.log(`⚠️ Función ${functionName} no encontrada, omitiendo...`);
        continue;
      }

      try {
        const params = paramsStr ? JSON.parse(paramsStr || '{}') : {};
        let result;
        
        // Verificar si es una función MCP usando el mixin
        if (this.isMCPFunction(functionName)) {
          // Es una función MCP - usar el método del mixin
          console.log(`🔄 Routing MCP function ${functionName}`);
          result = await this.executeMCPFunction(functionName, params);
          console.log(`✅ MCP function ${functionName} executed successfully`);
          
        } else if (this.functions.has(functionName)) {
          // Es una función local - usar el handler normal
          console.log(`🔄 Executing local function ${functionName}`);
          const func = this.functions.get(functionName);
          result = await func.handler(params);
          console.log(`✅ Local function ${functionName} executed successfully`);
          
        } else {
          console.warn(`❌ Function ${functionName} not found in any registry`);
          result = `Error: Function ${functionName} not found`;
        }

        const resultStr = typeof result === "object" ? JSON.stringify(result) : String(result);
        
        processedText = processedText.replace(
          fullMatch,
          `[[result: ${resultStr}]]`
        );

        console.log(`✅ Function ${functionName} result:`, result);
        hadAnyFunctionCalls = true;
        
      } catch (error) {
        console.error(`❌ Error calling function ${functionName}:`, error);
        processedText = processedText.replace(
          fullMatch,
          `[[result: Error calling function: ${error.message}]]`
        );
      }
    }

    console.log(`🔍 Function processing complete. Had calls: ${hadAnyFunctionCalls}`);
    return processedText;
  }

  /**
   * Obtener configuración completa para exportar
   */
  async exportConfiguration() {
    const localConfig = {
      local: this.getRegisteredFunctions(),
      mcp: this.exportMCPConfiguration()
    };

    return {
      type: 'hybrid',
      timestamp: new Date().toISOString(),
      stats: this.getFunctionStats(),
      configuration: localConfig
    };
  }

  /**
   * Cerrar todas las conexiones MCP
   */
  async cleanup() {
    try {
      await this.cleanupMCP();
      console.log('🧹 Limpieza de conexiones MCP completada');
    } catch (error) {
      console.error('❌ Error en limpieza:', error);
    }
  }

  async print() {
    const stats = this.getFunctionStats();
    console.log("📊 Function Statistics:");
    console.log(`   Local functions: ${stats.local.count}`);
    console.log(`   MCP functions: ${stats.mcp.count}`);
    console.log(`   Total functions: ${stats.total}`);
    if (stats.mcp.servers && stats.mcp.servers.length > 0) {
      console.log(`   MCP servers: ${stats.mcp.servers.join(', ')}`);
    }
  }
}

/**
 * Factory function para crear handler híbrido preconfigurado
 */
export async function getLLamaFunctionsMCPHandler(config = {}) {
  console.log('🏭 CreateHybridHandler: Iniciando creación con config:', Object.keys(config));
  
  const {
    modelPath,
    localFunctions = ['fruits', 'system'],
    mcpServers = [],
    ...llamaConfig
  } = config;

  console.log('🏭 CreateHybridHandler: Creando instancia de LlamaFunctionMCPHandler...');
  const handler = new LlamaFunctionMCPHandler({
    modelPath,
    ...llamaConfig
  });

  // Registrar servidores MCP ANTES de inicializar
  if (mcpServers.length > 0) {
    console.log(`🏭 CreateHybridHandler: Registrando ${mcpServers.length} servidores MCP...`);
    
    const mcpResult = await handler.registerMCPServers(mcpServers);
    console.log(`✅ CreateHybridHandler: ${mcpResult.registered} servidores registrados, ${mcpResult.errors} errores`);
  }
  
  // AHORA inicializar con todas las funciones disponibles
  console.log('🏭 CreateHybridHandler: Iniciando inicialización del handler...');
  await handler.initialize();
  
  console.log(`✅ CreateHybridHandler: Handler híbrido creado con ${handler.getFunctionStats().total} funciones`);
  
  return handler;
}

/**
 * Configuraciones predefinidas para diferentes escenarios
 */
export const LLAMA_FUNCTIONS_PRESETS = {
  // Solo funciones locales básicas
  local: {
    localFunctions: ['fruits', 'system'],
    mcpServers: []
  },
  
  // Con servidor MCP de desarrollo
  development: {
    localFunctions: ['fruits', 'system'],
    mcpServers: [
      {
        name: 'devops-mcp',
        url: 'http://localhost:3003',
        transport: 'http'
      }
    ]
  },
  
  // Configuración completa con múltiples servidores
  full: {
    localFunctions: ['fruits', 'system'],
    mcpServers: [
      {
        name: 'devops-mcp',
        url: 'http://localhost:3003',
        transport: 'http'
      },
      {
        name: 'wiki-mcp',
        url: 'http://localhost:3004',
        transport: 'http'
      }
    ]
  }
};