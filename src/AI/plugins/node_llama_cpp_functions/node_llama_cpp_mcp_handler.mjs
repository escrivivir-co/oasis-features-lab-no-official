import { NodeLLamaCppHandler, NODE_LLAMA_CPP_CONFIGS } from './node_llama_cpp_handler.mjs';
import { MCPMixin } from '../mcp/MCPMixin.mjs';

/**
 * Handler MCP que extiende NodeLLamaCppHandler para usar node-llama-cpp nativo
 * con funciones MCP. Más simple que la implementación manual.
 */
export class NodeLLamaCppMCPHandler extends NodeLLamaCppHandler {
  constructor(config = {}) {
    super(config);
    
    // Aplicar MCPMixin
    Object.assign(this, new MCPMixin());
    
    // Procesar functionSets usando NODE_LLAMA_CPP_CONFIGS
    const { functionSets = [] } = config;
    this.initializeLocalFunctions(functionSets);
  }

  /**
   * Inicializar funciones locales usando NODE_LLAMA_CPP_CONFIGS
   */
  initializeLocalFunctions(functionSets) {
    if (functionSets.length > 0) {
      functionSets.forEach(setName => {
        if (NODE_LLAMA_CPP_CONFIGS[setName]) {
          this.registerFunctions(NODE_LLAMA_CPP_CONFIGS[setName]);
          console.log(`✅ Funciones locales registradas: ${setName}`);
        } else {
          console.warn(`⚠️ Set de funciones desconocido: ${setName}`);
        }
      });
    }
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
    const mcpFunctionMap = this._buildMCPFunctionMapping();
    
    // Integrar funciones MCP con node-llama-cpp usando prefijos cortos
    for (const [shortFunctionName, functionDef] of Object.entries(mcpFunctionMap)) {
      const serverInfo = this.functionToServerMap.get(shortFunctionName);
      
      // Registrar función con interceptación MCP
      this.registerMCPFunction(shortFunctionName, {
        description: functionDef.description,
        parameters: functionDef.parameters,
        serverInfo: serverInfo
      });
    }
    
    console.log(`🔧 NodeLLamaCppMCPHandler: Funciones MCP agregadas con prefijos cortos`);
  }

  /**
   * Registrar una función MCP con interceptación
   */
  registerMCPFunction(name, config) {
    const { description, parameters, serverInfo } = config;
    
    // Crear handler interceptado que ejecuta en MCP usando el mixin
    const mcpHandler = async (params) => {
      console.log(`🔄 NodeLLamaCppMCPHandler: Ejecutando función MCP ${name} -> ${serverInfo.toolName} en ${serverInfo.serverName}`);
      
      try {
        // Usar el método del mixin para ejecutar
        const result = await this.executeMCPFunction(name, params);
        console.log(`✅ NodeLLamaCppMCPHandler: Función MCP ${name} ejecutada exitosamente`);
        return result;
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
    
    const mcpStats = this.getMCPStats();
    
    return {
      local: {
        count: localCount,
        functions: Array.from(this.functions.keys()).filter(name => !name.includes('_'))
      },
      mcp: {
        count: mcpCount,
        functions: Array.from(this.functions.keys()).filter(name => name.includes('_')),
        servers: mcpStats.servers
      },
      total: this.functions.size
    };
  }

  /**
   * Obtener configuración completa para exportar
   */
  async exportConfiguration() {
    const stats = this.getFunctionStats();
    const mcpConfig = this.exportMCPConfiguration();
    
    return {
      type: 'mcp-native',
      timestamp: new Date().toISOString(),
      stats,
      mcpConfiguration: mcpConfig
    };
  }

  /**
   * Cerrar todas las conexiones MCP
   */
  async cleanup() {
    try {
      await this.cleanupMCP();
      console.log('🧹 NodeLLamaCppMCPHandler: Limpieza completada');
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
    const mcpStats = this.getMCPStats();
    if (mcpStats.lastResultsCount > 0) {
      console.log(`   Last MCP results: ${mcpStats.lastResultsCount}`);
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
    
    const mcpResult = await handler.registerMCPServers(mcpServers);
    console.log(`✅ CreateMCPModelHandler: ${mcpResult.registered} servidores registrados, ${mcpResult.errors} errores`);
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