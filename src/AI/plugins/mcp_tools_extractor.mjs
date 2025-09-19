import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { 
  StdioClientTransport
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { 
  StreamableHTTPClientTransport 
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Cliente MCP para extraer tools y metadata de servidores
 */
export class MCPToolsExtractor {
  constructor() {
    this.client = null;
    this.transport = null;
    this.serverInfo = null;
    this.isConnected = false;
  }

  /**
   * Conectar a un servidor MCP
   * @param {string|object} serverConfig - URL o configuración del servidor
   * @param {string} transportType - Tipo de transporte: 'stdio', 'http'
   */
  async connectToServer(serverConfig, transportType = 'http') {
    try {
      // Crear transporte según el tipo
      if (transportType === 'stdio') {
        if (typeof serverConfig === 'string') {
          throw new Error('stdio transport requires command and args configuration');
        }
        this.transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env || {}
        });
      } else if (transportType === 'http' || transportType === 'sse') {
        const url = typeof serverConfig === 'string' ? serverConfig : serverConfig.url;
        // Crear URL base con /mcp como en MCPClientDriver
        const baseUrl = new URL(`${url}/mcp`);
        this.transport = new StreamableHTTPClientTransport(baseUrl);
      } else {
        throw new Error(`Unsupported transport type: ${transportType}`);
      }

      // Crear cliente
      this.client = new Client(
        {
          name: "mcp-tools-extractor",
          version: "1.0.0"
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          }
        }
      );

      // Conectar con timeout
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000); // 10 segundos
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      this.isConnected = true;

      // Crear información básica del servidor (no hay getServerInfo en el SDK)
      this.serverInfo = {
        name: 'mcp-server', // nombre genérico
        version: 'unknown',
        url: typeof serverConfig === 'string' ? serverConfig : serverConfig.url
      };
      
      console.log(`✅ Conectado a servidor MCP en: ${this.serverInfo.url}`);
      return true;

    } catch (error) {
      console.error('❌ Error conectando al servidor MCP:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Listar todas las tools disponibles con sus esquemas
   */
  async listTools() {
    if (!this.isConnected || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error('❌ Error listando tools:', error);
      throw error;
    }
  }

  /**
   * Listar recursos disponibles
   */
  async listResources() {
    if (!this.isConnected || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listResources();
      return response.resources || [];
    } catch (error) {
      console.error('❌ Error listando resources:', error);
      throw error;
    }
  }

  /**
   * Listar prompts disponibles
   */
  async listPrompts() {
    if (!this.isConnected || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listPrompts();
      return response.prompts || [];
    } catch (error) {
      console.error('❌ Error listando prompts:', error);
      throw error;
    }
  }

  /**
   * Llamar a una tool específica
   */
  async callTool(name, arguments_ = {}) {
    if (!this.isConnected || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: arguments_
      });
      return response.content || [];
    } catch (error) {
      console.error(`❌ Error llamando tool ${name}:`, error);
      throw error;
    }
  }

  /**
   * Extraer metadata completa del servidor
   */
  async extractCompleteMetadata() {
    if (!this.isConnected) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const [tools, resources, prompts] = await Promise.all([
        this.listTools(),
        this.listResources(), 
        this.listPrompts()
      ]);

      return {
        serverInfo: this.serverInfo,
        tools,
        resources,
        prompts,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error extrayendo metadata completa:', error);
      throw error;
    }
  }

  /**
   * Cerrar conexión
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log('🔌 Desconectado del servidor MCP');
      } catch (error) {
        console.error('❌ Error desconectando:', error);
      }
    }
  }

  /**
   * Obtener nombre del servidor para prefijos de funciones
   */
  getServerName() {
    if (this.serverInfo?.url) {
      // Extraer hostname de la URL
      try {
        const url = new URL(this.serverInfo.url);
        return url.hostname.replace(/\./g, '-');
      } catch {
        return 'mcp-server';
      }
    }
    return this.serverInfo?.name || 'mcp-server';
  }
}