/**
 * Transformador de schemas MCP a formato node-llama-cpp functions
 */
export class MCPSchemaTransformer {
  constructor(serverName = 'mcp-server') {
    this.serverName = this.sanitizeServerName(serverName);
  }

  /**
   * Sanitizar nombre del servidor para uso en nombres de función
   */
  sanitizeServerName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Transformar una tool MCP a formato node-llama-cpp function
   */
  transformTool(tool) {
    if (!tool.name || !tool.description) {
      throw new Error(`Tool inválida: requiere name y description`);
    }

    // Generar nombre de función con prefijo del servidor
    const functionName = `${this.serverName}.${tool.name}`;

    // Convertir esquema de parámetros
    const parameters = this.convertInputSchema(tool.inputSchema);

    return {
      name: functionName,
      description: tool.description,
      parameters,
      meta: {
        originalToolName: tool.name,
        serverName: this.serverName,
        mcpTool: true
      }
    };
  }

  /**
   * Convertir esquema de entrada MCP a formato node-llama-cpp
   */
  convertInputSchema(inputSchema) {
    if (!inputSchema) {
      return {
        type: "object",
        properties: {},
        required: []
      };
    }

    // Si ya está en formato JSON Schema válido, usar tal como está
    if (inputSchema.type === 'object' && inputSchema.properties) {
      return {
        type: inputSchema.type,
        properties: inputSchema.properties,
        required: inputSchema.required || []
      };
    }

    // Manejar otros formatos si es necesario
    if (typeof inputSchema === 'object') {
      return {
        type: "object",
        properties: inputSchema,
        required: Object.keys(inputSchema).filter(key => 
          inputSchema[key].required === true
        )
      };
    }

    // Fallback: esquema vacío
    return {
      type: "object", 
      properties: {},
      required: []
    };
  }

  /**
   * Transformar array de tools a configuración de funciones
   */
  transformTools(tools) {
    const functions = {};
    
    for (const tool of tools) {
      try {
        const transformedFunction = this.transformTool(tool);
        functions[transformedFunction.name] = transformedFunction;
      } catch (error) {
        console.warn(`⚠️ No se pudo transformar tool ${tool.name}:`, error.message);
      }
    }

    return functions;
  }

  /**
   * Generar configuración completa compatible con LOCAL_FUNCTION_CONFIGS
   */
  generateFunctionConfig(tools, includeMetadata = true) {
    const functions = this.transformTools(tools);
    
    const config = {
      [this.serverName]: {}
    };

    // Agrupar funciones sin el prefijo del servidor
    for (const [fullName, functionDef] of Object.entries(functions)) {
      const shortName = fullName.replace(`${this.serverName}.`, '');
      
      config[this.serverName][shortName] = {
        description: functionDef.description,
        parameters: functionDef.parameters,
        // El handler será añadido por MCPFunctionHandler
        handler: null, 
        meta: includeMetadata ? functionDef.meta : undefined
      };
    }

    return config;
  }

  /**
   * Generar metadata del servidor para documentación
   */
  generateServerMetadata(serverInfo, tools, resources = [], prompts = []) {
    return {
      server: {
        name: serverInfo?.name || this.serverName,
        version: serverInfo?.version || 'unknown',
        description: serverInfo?.description || '',
        capabilities: serverInfo?.capabilities || {}
      },
      stats: {
        toolsCount: tools.length,
        resourcesCount: resources.length,
        promptsCount: prompts.length
      },
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        functionName: `${this.serverName}.${tool.name}`,
        hasSchema: !!tool.inputSchema,
        parameterCount: this.countParameters(tool.inputSchema)
      })),
      generatedAt: new Date().toISOString(),
      transformer: {
        version: '1.0.0',
        serverPrefix: this.serverName
      }
    };
  }

  /**
   * Contar parámetros en un esquema
   */
  countParameters(inputSchema) {
    if (!inputSchema || !inputSchema.properties) return 0;
    return Object.keys(inputSchema.properties).length;
  }

  /**
   * Validar que una tool transformada sea válida
   */
  validateTransformedFunction(functionDef) {
    const required = ['name', 'description', 'parameters'];
    const missing = required.filter(field => !functionDef[field]);
    
    if (missing.length > 0) {
      throw new Error(`Función inválida: faltan campos ${missing.join(', ')}`);
    }

    if (!functionDef.parameters.type) {
      throw new Error('Función inválida: parameters debe tener type');
    }

    return true;
  }

  /**
   * Transformar metadata completa del servidor
   */
  transformCompleteMetadata(metadata) {
    const { serverInfo, tools, resources, prompts } = metadata;
    
    // Transformar tools a funciones
    const functionConfig = this.generateFunctionConfig(tools);
    
    // Generar metadata del servidor
    const serverMetadata = this.generateServerMetadata(
      serverInfo, 
      tools, 
      resources, 
      prompts
    );

    return {
      functionConfig,
      serverMetadata,
      raw: metadata
    };
  }
}