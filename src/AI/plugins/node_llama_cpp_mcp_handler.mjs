import { NodeLLamaCppHandler, NODE_LLAMA_CPP_CONFIGS } from './node_llama_cpp_handler.mjs';
import { getMCPFunctionHandler } from './mcp/mcp_function_handler.mjs';

/**
 * Handler MCP que extiende NodeLLamaCppHandler para usar node-llama-cpp nativo
 * con funciones MCP. Más simple que la implementación manual.
 */
export class NodeLLamaCppMCPHandler extends NodeLLamaCppHandler {
  constructor(config = {}) {
    super(config);
    this.mcpHandler = getMCPFunctionHandler();
    this.mcpServers = new Map(); // serverName -> config
    this.functionToServerMap = new Map(); // functionName -> serverInfo para routing
    this.lastMCPResults = []; // Almacenar resultados MCP para debugging
  }

  /**
   * Registrar un servidor MCP adicional
   */
  async registerMCPServer(serverName, serverConfig, transportType = 'http') {
    try {
      console.log(`🔧 NodeLLamaCppMCPHandler: Registrando servidor ${serverName} en ${serverConfig}...`);
      
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
        }
      } catch (infoError) {
        console.warn(`⚠️ No se pudo obtener server info de ${result.serverName}:`, infoError.message);
      }
      
      // Actualizar el registro con la información correcta
      this.mcpServers.set(actualServerName, {
        config: serverConfig,
        transportType,
        toolsCount: result.toolsCount,
        originalName: result.serverName,
        serverDetails: serverDetails
      });
      
      console.log(`✅ Servidor MCP ${actualServerName} registrado en NodeLLamaCppMCPHandler`);
      
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
   * Generar prefijo corto para nombre de servidor (igual que hybrid)
   */
  _generateShortPrefix(serverName) {
    const knownMappings = {
      'devops-mcp-server': 'dms',
      'wiki-mcp-browser': 'wiki',
      'state-machine-server': 'state',
      'localhost': 'local'
    };
    
    if (knownMappings[serverName]) {
      return knownMappings[serverName];
    }
    
    if (serverName.includes('-')) {
      return serverName.split('-')
        .map(word => word.charAt(0))
        .join('')
        .toLowerCase()
        .substring(0, 4);
    }
    
    return serverName.toLowerCase().substring(0, 4);
  }

  /**
   * Inicializar funciones incluyendo MCP
   */
  initFunctions() {
    // Primero registrar funciones locales
    super.initFunctions();
    
    // Luego agregar funciones MCP
    this._addMCPFunctions();
    
    console.log(`🔧 NodeLLamaCppMCPHandler: Total de funciones: ${this.functions.size}`);
  }

  /**
   * Agregar funciones MCP al registro de funciones
   */
  _addMCPFunctions() {
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    
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
        
        // Registrar función con interceptación MCP
        this.registerMCPFunction(shortFunctionName, {
          description: functionDef.description,
          parameters: functionDef.parameters,
          serverInfo: {
            serverName: actualServerName,
            originalServerName: originalServerName,
            toolName: toolName,
            shortPrefix: shortPrefix
          }
        });
        
        // Mapear función a información del servidor para debugging
        this.functionToServerMap.set(shortFunctionName, {
          serverName: actualServerName,
          originalServerName: originalServerName,
          toolName: toolName,
          shortPrefix: shortPrefix
        });
      }
    }
    
    console.log(`🔧 NodeLLamaCppMCPHandler: Funciones MCP agregadas con prefijos cortos`);
  }

  /**
   * Registrar una función MCP con interceptación
   */
  registerMCPFunction(name, config) {
    const { description, parameters, serverInfo } = config;
    
    // Crear handler interceptado que ejecuta en MCP
    const mcpHandler = async (params) => {
      console.log(`🔄 NodeLLamaCppMCPHandler: Ejecutando función MCP ${name} -> ${serverInfo.toolName} en ${serverInfo.serverName}`);
      
      try {
        // Ejecutar en el servidor MCP correcto
        const mcpResult = await this.mcpHandler.executeFunction(
          serverInfo.originalServerName,  // Usar nombre original para routing interno
          serverInfo.toolName,
          params
        );
        
        if (mcpResult.success) {
          console.log(`✅ NodeLLamaCppMCPHandler: Función MCP ${name} ejecutada exitosamente`);
          
          // Almacenar resultado para debugging
          this.lastMCPResults.push({
            name,
            params,
            result: mcpResult.result,
            serverInfo
          });
          
          return mcpResult.result;
        } else {
          throw new Error(`MCP function failed: ${mcpResult.error}`);
        }
      } catch (error) {
        console.error(`❌ NodeLLamaCppMCPHandler: Error ejecutando función MCP ${name}:`, error);
        throw error;
      }
    };

    // Convertir al formato esperado por node-llama-cpp
    const nodeLlamaFunction = {
      description: description,
      params: parameters,
      handler: mcpHandler,
    };

    this.functions.set(name, nodeLlamaFunction);
    console.log(`🔧 NodeLLamaCppMCPHandler: Función MCP registrada: ${name}`);
  }

  /**
   * Obtener estadísticas de funciones (local + MCP)
   */
  getFunctionStats() {
    const localCount = Array.from(this.functions.keys()).filter(name => !name.includes('_')).length;
    const mcpCount = Array.from(this.functions.keys()).filter(name => name.includes('_')).length;
    
    return {
      local: {
        count: localCount,
        functions: Array.from(this.functions.keys()).filter(name => !name.includes('_'))
      },
      mcp: {
        count: mcpCount,
        functions: Array.from(this.functions.keys()).filter(name => name.includes('_')),
        servers: Array.from(this.mcpServers.keys())
      },
      total: this.functions.size
    };
  }

  /**
   * Obtener configuración completa para exportar
   */
  async exportConfiguration() {
    const stats = this.getFunctionStats();
    
    return {
      type: 'mcp-native',
      timestamp: new Date().toISOString(),
      stats,
      mcpServers: Array.from(this.mcpServers.entries()).map(([name, info]) => ({
        name,
        originalName: info.originalName,
        config: info.config,
        toolsCount: info.toolsCount
      }))
    };
  }

  /**
   * Cerrar todas las conexiones MCP
   */
  async cleanup() {
    try {
      await this.mcpHandler.disconnectAll();
      console.log('🧹 NodeLLamaCppMCPHandler: Limpieza de conexiones MCP completada');
    } catch (error) {
      console.error('❌ NodeLLamaCppMCPHandler: Error en limpieza:', error);
    }
  }

  async print() {
    const stats = this.getFunctionStats();
    console.log("📊 NodeLLamaCppMCPHandler Function Statistics:");
    console.log(`   Local functions: ${stats.local.count}`);
    console.log(`   MCP functions: ${stats.mcp.count}`);
    console.log(`   Total functions: ${stats.total}`);
    if (stats.mcp.servers && stats.mcp.servers.length > 0) {
      console.log(`   MCP servers: ${stats.mcp.servers.join(', ')}`);
    }
    if (this.lastMCPResults.length > 0) {
      console.log(`   Last MCP results: ${this.lastMCPResults.length}`);
    }
  }
}

/**
 * Factory function para crear handler MCP nativo preconfigurado
 */
export async function createMCPModelHandler(config = {}) {
  console.log('🏭 CreateMCPModelHandler: Iniciando creación con config:', Object.keys(config));
  
  const {
    modelPath,
    functionSets = ['fruits', 'system'],
    mcpServers = [],
    ...llamaConfig
  } = config;

  console.log('🏭 CreateMCPModelHandler: Creando instancia de NodeLLamaCppMCPHandler...');
  const handler = new NodeLLamaCppMCPHandler({
    modelPath,
    functionSets,
    ...llamaConfig
  });

  // Registrar servidores MCP ANTES de inicializar
  if (mcpServers.length > 0) {
    console.log(`🏭 CreateMCPModelHandler: Registrando ${mcpServers.length} servidores MCP...`);
    
    const mcpRegistrations = mcpServers.map(async (serverConfig) => {
      const { name, url, transport = 'http' } = serverConfig;
      console.log(`🏭 CreateMCPModelHandler: Registrando servidor ${name} en ${url}...`);
      return await handler.registerMCPServer(name, url, transport);
    });

    const mcpResults = await Promise.allSettled(mcpRegistrations);
    
    // Reportar resultados
    mcpResults.forEach((result, index) => {
      const serverConfig = mcpServers[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ CreateMCPModelHandler: Servidor MCP ${serverConfig.name} registrado exitosamente`);
      } else {
        console.error(`❌ CreateMCPModelHandler: Error registrando servidor MCP ${serverConfig.name}:`, result.reason);
      }
    });
  }
  
  // AHORA inicializar con todas las funciones disponibles
  console.log('🏭 CreateMCPModelHandler: Iniciando inicialización del handler...');
  await handler.initialize();
  
  console.log(`✅ CreateMCPModelHandler: Handler MCP nativo creado con ${handler.getFunctionStats().total} funciones`);
  
  return handler;
}

/**
 * Instancia singleton
 */
let mcpModelHandler = null;

export async function getNodeLlamaCppMCPHandler(config = {}) {
  if (!mcpModelHandler) {
    mcpModelHandler = await createMCPModelHandler(config);
  }
  return mcpModelHandler;
}

/**
 * Configuraciones predefinidas para diferentes escenarios
 */
export const MCP_MODEL_PRESETS = {
  // Con servidor MCP de desarrollo
  development: {
    functionSets: ['fruits', 'system'],
    mcpServers: [
      {
        name: 'localhost',
        url: 'http://localhost:3003',
        transport: 'http'
      }
    ]
  },
  
  // Configuración completa con múltiples servidores
  full: {
    functionSets: ['fruits', 'system'],
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