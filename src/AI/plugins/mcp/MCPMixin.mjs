import { getMCPFunctionHandler } from './mcp_function_handler.mjs';

/**
 * Mixin con funcionalidades comunes de gestión MCP
 * Puede ser usado por cualquier handler que necesite integración MCP
 */
export class MCPMixin {
  constructor() {
    this.mcpHandler = getMCPFunctionHandler();
    this.mcpServers = new Map(); // serverName -> config
    this.serverNameMap = new Map(); // configName -> realServerName
    this.functionToServerMap = new Map(); // functionName -> serverInfo para routing
    this.lastMCPResults = []; // Almacenar resultados MCP para debugging
  }

  /**
   * Registrar un servidor MCP adicional
   */
  async registerMCPServer(serverName, serverConfig, transportType = 'http') {
    try {
      console.log(`🔧 MCPMixin: Registrando servidor ${serverName} en ${serverConfig}...`);
      
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
      
      console.log(`✅ Servidor MCP ${actualServerName} registrado exitosamente`);
      
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
   * Construir mapeo de funciones MCP con prefijos cortos
   */
  _buildMCPFunctionMapping() {
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    const mcpFunctionMap = {};
    
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
        
        mcpFunctionMap[shortFunctionName] = {
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
    
    return mcpFunctionMap;
  }

  /**
   * Ejecutar función MCP usando routing inteligente
   */
  async executeMCPFunction(functionName, params) {
    const serverInfo = this.functionToServerMap.get(functionName);
    if (!serverInfo) {
      throw new Error(`Función MCP ${functionName} no encontrada en mapeo`);
    }

    console.log(`🔄 MCPMixin: Ejecutando función MCP ${functionName} -> ${serverInfo.toolName} en ${serverInfo.serverName}`);
    
    try {
      // Ejecutar en el servidor MCP correcto usando originalServerName para routing interno
      const mcpResult = await this.mcpHandler.executeFunction(
        serverInfo.originalServerName,
        serverInfo.toolName,
        params
      );
      
      if (mcpResult.success) {
        // console.log(`✅ MCPMixin: ${functionName} success!`);
        
        // Almacenar resultado para debugging
        this.lastMCPResults.push({
          name: functionName,
          params,
          result: mcpResult.result,
          serverInfo
        });
        
        return mcpResult.result;
      } else {
        throw new Error(`MCP function failed: ${mcpResult.error}`);
      }
    } catch (error) {
      console.error(`❌ MCPMixin: Error ejecutando función MCP ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Registrar múltiples servidores MCP desde configuración
   */
  async registerMCPServers(mcpServers = []) {
    if (mcpServers.length === 0) {
      return { registered: 0, errors: 0 };
    }

    console.log(`🔧 MCPMixin: Registrando ${mcpServers.length} servidores MCP...`);
    
    const mcpRegistrations = mcpServers.map(async (serverConfig) => {
      const { name, url, transport = 'http' } = serverConfig;
      console.log(`🔧 MCPMixin: Register server ${name} at ${url}...`);
      return await this.registerMCPServer(name, url, transport);
    });

    const mcpResults = await Promise.allSettled(mcpRegistrations);
    
    // Reportar resultados
    mcpResults.forEach((result, index) => {
      const serverConfig = mcpServers[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ MCPMixin: Servidor MCP ${serverConfig.name} registrado exitosamente`);
      } else {
        console.error(`❌ MCPMixin: Error registrando servidor MCP ${serverConfig.name}:`, result.reason);
      }
    });

    const registered = mcpResults.filter(r => r.status === 'fulfilled').length;
    const errors = mcpResults.filter(r => r.status === 'rejected').length;

    return { registered, errors };
  }

  /**
   * Obtener estadísticas de funciones MCP
   */
  getMCPStats() {
    const mcpFunctions = this.mcpHandler.getAllFunctions();
    
    const mcpCount = Object.values(mcpFunctions).reduce((count, serverFunctions) => {
      return count + Object.keys(serverFunctions).length;
    }, 0);

    const realServerNames = Array.from(this.mcpServers.keys());
    const serverDetails = Array.from(this.mcpServers.entries()).map(([name, info]) => ({
      name,
      originalName: info.originalName,
      toolsCount: info.toolsCount,
      hasServerInfo: !!info.serverDetails.name
    }));

    return {
      count: mcpCount,
      servers: realServerNames,
      serverDetails: this.mcpHandler.getServersStatus(),
      registeredServers: serverDetails,
      lastResultsCount: this.lastMCPResults.length
    };
  }

  /**
   * Obtener configuración MCP para exportar
   */
  exportMCPConfiguration() {
    return {
      servers: Array.from(this.mcpServers.entries()).map(([name, info]) => ({
        name,
        originalName: info.originalName,
        config: info.config,
        toolsCount: info.toolsCount
      })),
      stats: this.getMCPStats(),
      lastResults: this.lastMCPResults.slice(-5) // Solo últimos 5 para no sobrecargar
    };
  }

  /**
   * Cerrar todas las conexiones MCP
   */
  async cleanupMCP() {
    try {
      await this.mcpHandler.disconnectAll();
      console.log('🧹 MCPMixin: Limpieza de conexiones MCP completada');
    } catch (error) {
      console.error('❌ MCPMixin: Error en limpieza:', error);
    }
  }

  /**
   * Verificar si una función es MCP basándose en el mapeo
   */
  isMCPFunction(functionName) {
    return this.functionToServerMap.has(functionName);
  }

  /**
   * Invalidar cache de funciones MCP (útil cuando se registran nuevos servidores)
   */
  invalidateMCPCache() {
    // Esto puede ser sobrescrito por las clases hijas si manejan cache
    this.functionToServerMap.clear();
  }
}