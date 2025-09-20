import { LocalLlamaFunctionHandler, LOCAL_FUNCTION_CONFIGS } from './llama_functions_local.mjs';
import { getMCPFunctionHandler } from './mcp_function_handler.mjs';

/**
 * Handler híbrido que combina funciones locales con funciones MCP
 */
export class HybridLlamaFunctionHandler extends LocalLlamaFunctionHandler {
  constructor(config = {}) {
    super(config);
    this.mcpHandler = getMCPFunctionHandler();
    this.mcpServers = new Map(); // serverName -> config
  }

  /**
   * Inicializar el handler híbrido con todas las funciones
   */
  async initialize() {
    // Registrar todas las funciones combinadas antes de inicializar el modelo
    const allFunctions = this.getFunctionsForNodeLlama();
    
    // Limpiar funciones existentes
    this.functions.clear();
    
    // Registrar cada función individualmente
    for (const [name, functionDef] of Object.entries(allFunctions)) {
      this.registerFunction(name, functionDef);
    }
    
    console.log(`🔧 Registradas ${Object.keys(allFunctions).length} funciones antes de inicializar modelo`);
    
    // Luego inicializar el modelo con todas las funciones registradas
    await super.initialize();
    
    console.log('✅ Handler híbrido inicializado con modelo');
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
   * Obtener todas las funciones (locales + MCP) para node-llama-cpp
   */
  getFunctionsForNodeLlama() {
    // Empezar con funciones locales
    const localFunctions = super.getFunctionsForNodeLlama();
    
    // Añadir funciones MCP
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    
    // Combinar ambos tipos
    const allFunctions = { ...localFunctions };
    
    // Integrar funciones MCP con el formato correcto
    for (const [originalServerName, serverFunctions] of Object.entries(mcpFunctions)) {
      // Buscar el nombre real del servidor en nuestro registro
      let actualServerName = originalServerName;
      
      for (const [registeredName, serverInfo] of this.mcpServers.entries()) {
        if (serverInfo.originalName === originalServerName) {
          actualServerName = registeredName;
          break;
        }
      }
      
      for (const [toolName, functionDef] of Object.entries(serverFunctions)) {
        // Crear función con prefijo del servidor (usando nombre real)
        const fullFunctionName = `${actualServerName}_${toolName}`;
        
        allFunctions[fullFunctionName] = {
          description: functionDef.description,
          parameters: functionDef.parameters,
          handler: functionDef.handler
        };
      }
    }
    
    console.log(`🔧 Combined functions available: ${Object.keys(allFunctions).length}`);
    console.log(`📋 Function names: ${Object.keys(allFunctions).join(', ')}`);
    
    return allFunctions;
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
   * Chat con funciones híbridas (locales + MCP)
   */
  async chat(userInput, systemContext = "") {
    try {
      // Obtener todas las funciones combinadas
      const allFunctions = this.getFunctionsForNodeLlama();
      
      console.log(`🔧 Iniciando chat híbrido con ${Object.keys(allFunctions).length} funciones disponibles`);
      
      // Usar el método chat de la clase padre con todas las funciones
      return await super.chat(userInput, systemContext);
      
    } catch (error) {
      console.error('❌ Error en chat híbrido:', error);
      throw error;
    }
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
export async function createHybridHandler(config = {}) {
  const {
    modelPath,
    localFunctions = ['fruits', 'system'],
    mcpServers = [],
    ...llamaConfig
  } = config;

  const handler = new HybridLlamaFunctionHandler({
    modelPath,
    ...llamaConfig
  });

  // Registrar servidores MCP ANTES de inicializar
  if (mcpServers.length > 0) {
    const mcpRegistrations = mcpServers.map(async (serverConfig) => {
      const { name, url, transport = 'http' } = serverConfig;
      return await handler.registerMCPServer(name, url, transport);
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
  }
  
  // AHORA inicializar con todas las funciones disponibles
  await handler.initialize();
  
  console.log(`✅ Handler híbrido creado con ${handler.getFunctionStats().total} funciones`);
  
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