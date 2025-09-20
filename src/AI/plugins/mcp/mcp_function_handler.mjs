import { MCPToolsExtractor } from './mcp_tools_extractor.mjs';
import { MCPSchemaTransformer } from './mcp_schema_transformer.mjs';

/**
 * Handler genérico para ejecutar funciones MCP desde node-llama-cpp
 */
export class MCPFunctionHandler {
  constructor() {
    this.extractors = new Map(); // serverName -> MCPToolsExtractor
    this.transformers = new Map(); // serverName -> MCPSchemaTransformer  
    this.functionConfigs = new Map(); // serverName -> config
    this.isInitialized = false;
  }

  /**
   * Registrar un servidor MCP
   */
  async registerServer(serverName, serverConfig, transportType = 'http') {
    try {
      // Crear extractor para el servidor
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(serverConfig, transportType);
      
      // Obtener metadata del servidor  
      const metadata = await extractor.extractCompleteMetadata();
      
      // Crear transformador con el nombre real del servidor
      const actualServerName = extractor.getServerName();
      const transformer = new MCPSchemaTransformer(actualServerName);
      
      // Transformar tools a configuración de funciones
      const { functionConfig } = transformer.transformCompleteMetadata(metadata);
      
      // Almacenar componentes
      this.extractors.set(actualServerName, extractor);
      this.transformers.set(actualServerName, transformer);
      this.functionConfigs.set(actualServerName, functionConfig);
      
      console.log(`✅ Servidor MCP registrado: ${actualServerName} (${metadata.tools.length} tools)`);
      
      return {
        serverName: actualServerName,
        toolsCount: metadata.tools.length,
        functionConfig: functionConfig[actualServerName]
      };
      
    } catch (error) {
      console.error(`❌ Error registrando servidor ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener todas las funciones registradas en formato node-llama-cpp
   */
  getAllFunctions() {
    const allFunctions = {};
    
    for (const [serverName, config] of this.functionConfigs) {
      // Añadir handlers a las funciones
      const serverFunctions = { ...config[serverName] };
      
      for (const [toolName, functionDef] of Object.entries(serverFunctions)) {
        // Crear handler que ejecuta la tool via MCP
        functionDef.handler = async (params) => {
          return await this.executeFunction(serverName, toolName, params);
        };
      }
      
      allFunctions[serverName] = serverFunctions;
    }
    
    return allFunctions;
  }

  /**
   * Ejecutar una función MCP
   */
  async executeFunction(serverName, toolName, parameters = {}) {
    try {
      const extractor = this.extractors.get(serverName);
      if (!extractor) {
        throw new Error(`Servidor no registrado: ${serverName}`);
      }

      if (!extractor.isConnected) {
        throw new Error(`Servidor desconectado: ${serverName}`);
      }

      // Ejecutar la tool en el servidor MCP
      console.log(`🔧 Execute ${serverName}.${toolName} with params:`, parameters);
      
      const result = await extractor.callTool(toolName, parameters);
      
      console.log(`✅ Back from ${serverName}.${toolName}!`);
      
      // Formatear resultado para node-llama-cpp
      return this.formatResult(result);
      
    } catch (error) {
      console.error(`❌ Error ejecutando ${serverName}.${toolName}:`, error);
      
      // Retornar error formateado
      return {
        error: true,
        message: error.message,
        tool: `${serverName}.${toolName}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Formatear resultado de MCP para node-llama-cpp
   */
  formatResult(mcpResult) {
    if (!mcpResult || mcpResult.length === 0) {
      return { success: true, result: null };
    }

    // Si es un array de contenido, extraer el primer elemento
    if (Array.isArray(mcpResult)) {
      const firstResult = mcpResult[0];
      
      if (firstResult?.type === 'text') {
        return { success: true, result: firstResult.text };
      }
      
      if (firstResult?.type === 'resource') {
        return { 
          success: true, 
          result: firstResult.resource,
          type: 'resource'
        };
      }
      
      // Formato genérico
      return { success: true, result: mcpResult };
    }

    // Resultado directo
    return { success: true, result: mcpResult };
  }

  /**
   * Obtener estado de todos los servidores
   */
  getServersStatus() {
    const status = {};
    
    for (const [serverName, extractor] of this.extractors) {
      const config = this.functionConfigs.get(serverName);
      const toolCount = config ? Object.keys(config[serverName] || {}).length : 0;
      
      status[serverName] = {
        connected: extractor.isConnected,
        toolsCount: toolCount,
        serverInfo: extractor.serverInfo
      };
    }
    
    return status;
  }

  /**
   * Desconectar un servidor específico
   */
  async disconnectServer(serverName) {
    const extractor = this.extractors.get(serverName);
    if (extractor) {
      await extractor.disconnect();
      this.extractors.delete(serverName);
      this.transformers.delete(serverName);
      this.functionConfigs.delete(serverName);
      console.log(`🔌 Servidor ${serverName} desconectado y eliminado`);
    }
  }

  /**
   * Desconectar todos los servidores
   */
  async disconnectAll() {
    const disconnectPromises = [];
    
    for (const [serverName, extractor] of this.extractors) {
      disconnectPromises.push(extractor.disconnect());
    }
    
    await Promise.all(disconnectPromises);
    
    this.extractors.clear();
    this.transformers.clear();
    this.functionConfigs.clear();
    
    console.log('🔌 Todos los servidores MCP desconectados');
  }

  /**
   * Obtener configuración completa para exportar
   */
  exportConfiguration() {
    const config = {
      servers: {},
      functions: this.getAllFunctions(),
      metadata: {
        serversCount: this.extractors.size,
        totalFunctions: 0,
        exportedAt: new Date().toISOString()
      }
    };

    // Contar funciones totales
    for (const serverFunctions of Object.values(config.functions)) {
      config.metadata.totalFunctions += Object.keys(serverFunctions).length;
    }

    // Información de servidores
    for (const [serverName, extractor] of this.extractors) {
      config.servers[serverName] = {
        serverInfo: extractor.serverInfo,
        connected: extractor.isConnected
      };
    }

    return config;
  }
}

// Instancia singleton global
let mcpFunctionHandler = null;

/**
 * Obtener instancia singleton del handler MCP
 */
export function getMCPFunctionHandler() {
  if (!mcpFunctionHandler) {
    mcpFunctionHandler = new MCPFunctionHandler();
  }
  return mcpFunctionHandler;
}