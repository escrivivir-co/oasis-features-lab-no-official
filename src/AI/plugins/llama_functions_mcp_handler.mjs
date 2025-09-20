import { LocalLlamaFunctionHandler, LOCAL_FUNCTION_CONFIGS } from './llama_functions_handler.mjs';
import { getMCPFunctionHandler } from './mcp/mcp_function_handler.mjs';

/**
 * Handler híbrido que combina funciones locales con funciones MCP
 */
export class HybridLlamaFunctionHandler extends LocalLlamaFunctionHandler {
  constructor(config = {}) {
    super(config);
    this.mcpHandler = getMCPFunctionHandler();
    this.mcpServers = new Map(); // serverName -> config
    this.serverNameMap = new Map(); // configName -> realServerName
    this.functionsCache = null; // Cache para evitar recalcular funciones
    this.functionToServerMap = new Map(); // functionName -> serverInfo para routing
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
   * Registrar un servidor MCP adicional
   */
  async registerMCPServer(serverName, serverConfig, transportType = 'http') {
    try {
      const result = await this.mcpHandler.registerServer(serverName, serverConfig, transportType);
      
      // Intentar obtener información detallada del servidor usando get_server_info
      let actualServerName = result.serverName;
      let serverDetails = {};
      
      try {
        // Buscar si existe la tool get_server_info
        const allFunctions = this.mcpHandler.getAllFunctions();
        const serverFunctions = allFunctions[result.serverName];
        
        if (serverFunctions && serverFunctions['get_server_info']) {
          console.log(`🔍 Obteniendo información detallada del servidor ${result.serverName}...`);
          
          // Ejecutar get_server_info para obtener el nombre real
          const serverInfoResult = await this.mcpHandler.executeFunction(
            result.serverName, 
            'get_server_info', 
            {}
          );
          
          if (serverInfoResult.success && serverInfoResult.result) {
            try {
              const serverInfo = JSON.parse(serverInfoResult.result);
              if (serverInfo.name) {
                actualServerName = serverInfo.name;
                serverDetails = serverInfo;
                console.log(`✅ Nombre real del servidor detectado: ${actualServerName}`);
              }
            } catch (parseError) {
              console.warn(`⚠️ No se pudo parsear server info:`, parseError.message);
            }
          }
        } else {
          console.log(`ℹ️ Tool get_server_info no disponible en ${result.serverName}`);
        }
      } catch (infoError) {
        console.warn(`⚠️ No se pudo obtener server info de ${result.serverName}:`, infoError.message);
      }
      
      // Actualizar el registro con la información correcta
      this.mcpServers.set(actualServerName, {
        config: serverConfig,
        transportType,
        toolsCount: result.toolsCount,
        originalName: result.serverName, // Mantener referencia al nombre original
        serverDetails: serverDetails
      });
      
      // Invalidar cache de funciones para que se recalcule en la próxima inicialización
      this.functionsCache = null;
      
      console.log(`✅ Servidor MCP ${actualServerName} registrado en handler híbrido`);
      
      return {
        ...result,
        actualServerName,
        serverDetails
      };
    } catch (error) {
      console.error(`❌ Error registrando servidor MCP ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Generar prefijo corto para nombre de servidor
   */
  _generateShortPrefix(serverName) {
    // Casos específicos conocidos
    const knownMappings = {
      'devops-mcp-server': 'dms',
      'wiki-mcp-browser': 'wiki',
      'state-machine-server': 'state',
      'localhost': 'local'
    };
    
    if (knownMappings[serverName]) {
      return knownMappings[serverName];
    }
    
    // Generar automáticamente para nombres desconocidos
    if (serverName.includes('-')) {
      // Tomar iniciales de palabras separadas por guiones
      return serverName.split('-')
        .map(word => word.charAt(0))
        .join('')
        .toLowerCase()
        .substring(0, 4); // Máximo 4 caracteres
    }
    
    // Para nombres simples, tomar los primeros 3-4 caracteres
    return serverName.toLowerCase().substring(0, 4);
  }

  /**
   * Construir mapa combinado de funciones (solo se ejecuta una vez)
   */
  _buildCombinedFunctions() {
    // Empezar con funciones locales
    const localFunctions = super.getFunctionsForNodeLlama();
    
    // Añadir funciones MCP
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    
    // Combinar ambos tipos
    const allFunctions = { ...localFunctions };
    
    // Limpiar mapeo de funciones a servidores
    this.functionToServerMap.clear();
    
    // Integrar funciones MCP con prefijos cortos
    for (const [originalServerName, serverFunctions] of Object.entries(mcpFunctions)) {
      // Buscar el nombre real del servidor en nuestro registro
      let actualServerName = originalServerName;
      
      for (const [registeredName, serverInfo] of this.mcpServers.entries()) {
        if (serverInfo.originalName === originalServerName) {
          actualServerName = registeredName;
          break;
        }
      }
      
      // Generar prefijo corto para el servidor
      const shortPrefix = this._generateShortPrefix(actualServerName);
      
      for (const [toolName, functionDef] of Object.entries(serverFunctions)) {
        // Crear función con prefijo corto
        const shortFunctionName = `${shortPrefix}_${toolName}`;
        
        allFunctions[shortFunctionName] = {
          description: functionDef.description,
          parameters: functionDef.parameters,
          handler: functionDef.handler
        };
        
        // Mapear función a información del servidor para routing
        this.functionToServerMap.set(shortFunctionName, {
          serverName: actualServerName,
          originalServerName: originalServerName,
          toolName: toolName,
          shortPrefix: shortPrefix
        });
      }
    }
    
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
        if (LOCAL_FUNCTION_CONFIGS[setName]) {
          this.registerFunctions({ [setName]: LOCAL_FUNCTION_CONFIGS[setName] });
          console.log(`✅ Funciones locales registradas: ${setName}`);
        } else {
          console.warn(`⚠️ Set de funciones desconocido: ${setName}`);
        }
      });
    }

    // Registrar servidores MCP
    const mcpRegistrations = mcpServers.map(async (serverConfig) => {
      const { name, url, transport = 'http' } = serverConfig;
      return await this.registerMCPServer(name, url, transport);
    });

    const mcpResults = await Promise.allSettled(mcpRegistrations);
    
    // Reportar resultados
    mcpResults.forEach((result, index) => {
      const serverConfig = mcpServers[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ Servidor MCP ${serverConfig.name} registrado exitosamente`);
      } else {
        console.error(`❌ Error registrando servidor MCP ${serverConfig.name}:`, result.reason);
      }
    });

    return {
      local: localFunctionSets.length,
      mcp: mcpResults.filter(r => r.status === 'fulfilled').length,
      mcpErrors: mcpResults.filter(r => r.status === 'rejected').length
    };
  }

  /**
   * Obtener estadísticas de funciones registradas
   */
  getFunctionStats() {
    const localFunctions = super.getRegisteredFunctions();
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    
    const mcpCount = Object.values(mcpFunctions).reduce((count, serverFunctions) => {
      return count + Object.keys(serverFunctions).length;
    }, 0);

    // Obtener nombres reales de servidores
    const realServerNames = Array.from(this.mcpServers.keys());
    const serverDetails = Array.from(this.mcpServers.entries()).map(([name, info]) => ({
      name,
      originalName: info.originalName,
      toolsCount: info.toolsCount,
      hasServerInfo: !!info.serverDetails.name
    }));

    return {
      local: {
        count: Object.keys(localFunctions).length,
        functions: Object.keys(localFunctions)
      },
      mcp: {
        count: mcpCount,
        servers: realServerNames,
        serverDetails: this.mcpHandler.getServersStatus(),
        registeredServers: serverDetails
      },
      total: Object.keys(localFunctions).length + mcpCount
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
      if (!this.functionToServerMap.has(functionName) && !this.functions.has(functionName)) {
        console.log(`⚠️ Función ${functionName} no encontrada, omitiendo...`);
        continue;
      }

      try {
        const params = paramsStr ? JSON.parse(paramsStr || '{}') : {};
        let result;
        
        // Verificar si es una función MCP usando nuestro mapeo
        if (this.functionToServerMap.has(functionName)) {
          // Es una función MCP - routear al servidor correcto
          const serverInfo = this.functionToServerMap.get(functionName);
          console.log(`🔄 Routing MCP function ${functionName} to server ${serverInfo.originalServerName} (real name: ${serverInfo.serverName})`);
          
          // IMPORTANTE: Usar originalServerName para el routing interno del MCP handler
          // porque es el nombre con el que se registró originalmente en las estructuras internas
          const mcpResult = await this.mcpHandler.executeFunction(
            serverInfo.originalServerName,  // Nombre original usado internamente por MCP handler
            serverInfo.toolName,
            params
          );
          
          if (mcpResult.success) {
            result = mcpResult.result;
            console.log(`✅ MCP function ${functionName} executed successfully on ${serverInfo.serverName}`);
          } else {
            throw new Error(`MCP function failed: ${mcpResult.error}`);
          }
          
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
      mcp: this.mcpHandler.exportConfiguration()
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
      await this.mcpHandler.disconnectAll();
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

  console.log('🏭 CreateHybridHandler: Creando instancia de HybridLlamaFunctionHandler...');
  const handler = new HybridLlamaFunctionHandler({
    modelPath,
    ...llamaConfig
  });

  // Registrar servidores MCP ANTES de inicializar
  if (mcpServers.length > 0) {
    console.log(`🏭 CreateHybridHandler: Registrando ${mcpServers.length} servidores MCP...`);
    
    const mcpRegistrations = mcpServers.map(async (serverConfig) => {
      const { name, url, transport = 'http' } = serverConfig;
      console.log(`🏭 CreateHybridHandler: Registrando servidor ${name} en ${url}...`);
      return await handler.registerMCPServer(name, url, transport);
    });

    const mcpResults = await Promise.allSettled(mcpRegistrations);
    
    // Reportar resultados
    mcpResults.forEach((result, index) => {
      const serverConfig = mcpServers[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ CreateHybridHandler: Servidor MCP ${serverConfig.name} registrado exitosamente`);
      } else {
        console.error(`❌ CreateHybridHandler: Error registrando servidor MCP ${serverConfig.name}:`, result.reason);
      }
    });
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
export const HYBRID_PRESETS = {
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