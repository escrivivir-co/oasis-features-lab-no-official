#!/usr/bin/env node

import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { MCPToolsExtractor } from './mcp_tools_extractor.mjs';
import { MCPSchemaTransformer } from './mcp_schema_transformer.mjs';
import { getMCPFunctionHandler } from './mcp_function_handler.mjs';

const program = new Command();

program
  .name('mcp-query-server')
  .description('Query MCP servers and convert tools to node-llama-cpp compatible format')
  .version('1.0.0');

/**
 * Comando principal: extraer tools de servidor MCP
 */
program
  .command('extract')
  .description('Extract tools from MCP server and convert to node-llama-cpp format')
  .option('-s, --server <url>', 'MCP server URL', 'http://localhost:3003')
  .option('-t, --transport <type>', 'Transport type (http|stdio)', 'http')
  .option('-o, --output <file>', 'Output JSON file', 'mcp_functions.json')
  .option('-n, --name <name>', 'Server name override')
  .option('--tools-only', 'Extract only tools (no resources/prompts)')
  .option('--pretty', 'Pretty print JSON output')
  .option('--validate', 'Validate generated functions')
  .action(async (options) => {
    try {
      console.log(`🔍 Conectando a servidor MCP: ${options.server}`);
      
      // Crear extractor
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(options.server, options.transport);
      
      // Extraer metadata
      const metadata = options.toolsOnly 
        ? { tools: await extractor.listTools(), serverInfo: extractor.serverInfo }
        : await extractor.extractCompleteMetadata();
      
      console.log(`📊 Encontradas ${metadata.tools.length} tools`);
      
      // Transformar a formato node-llama-cpp
      const serverName = options.name || extractor.getServerName();
      const transformer = new MCPSchemaTransformer(serverName);
      const { functionConfig, serverMetadata } = transformer.transformCompleteMetadata(metadata);
      
      // Preparar salida
      const output = {
        metadata: serverMetadata,
        functions: functionConfig,
        generatedAt: new Date().toISOString(),
        command: {
          server: options.server,
          transport: options.transport,
          toolsOnly: options.toolsOnly
        }
      };
      
      // Validar si se solicita
      if (options.validate) {
        console.log('🔍 Validando funciones generadas...');
        let validCount = 0;
        for (const [serverName, serverFunctions] of Object.entries(functionConfig)) {
          for (const [toolName, functionDef] of Object.entries(serverFunctions)) {
            try {
              transformer.validateTransformedFunction(functionDef);
              validCount++;
            } catch (error) {
              console.warn(`⚠️ Función inválida ${serverName}.${toolName}:`, error.message);
            }
          }
        }
        console.log(`✅ ${validCount} funciones válidas de ${metadata.tools.length} total`);
      }
      
      // Escribir archivo de salida
      const jsonOutput = JSON.stringify(output, null, options.pretty ? 2 : 0);
      await writeFile(options.output, jsonOutput);
      
      console.log(`💾 Configuración guardada en: ${options.output}`);
      console.log(`📈 Resumen:`);
      console.log(`   - Servidor: ${serverMetadata.server.name}`);
      console.log(`   - Tools: ${serverMetadata.stats.toolsCount}`);
      console.log(`   - Funciones generadas: ${Object.keys(functionConfig[serverName] || {}).length}`);
      
      // Cerrar conexión
      await extractor.disconnect();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Comando: listar tools disponibles
 */
program
  .command('list')
  .description('List available tools from MCP server')
  .option('-s, --server <url>', 'MCP server URL', 'http://localhost:3003')
  .option('-t, --transport <type>', 'Transport type (http|stdio)', 'http')
  .option('--detailed', 'Show detailed tool information')
  .action(async (options) => {
    try {
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(options.server, options.transport);
      
      const tools = await extractor.listTools();
      
      console.log(`📋 Tools disponibles en ${extractor.getServerName()}:`);
      console.log('');
      
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        console.log(`   📝 ${tool.description}`);
        
        if (options.detailed && tool.inputSchema) {
          const paramCount = Object.keys(tool.inputSchema.properties || {}).length;
          console.log(`   🔧 Parámetros: ${paramCount}`);
          if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
            console.log(`   ❗ Requeridos: ${tool.inputSchema.required.join(', ')}`);
          }
        }
        console.log('');
      });
      
      await extractor.disconnect();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

/**
 * Comando: test de conexión
 */
program
  .command('test')
  .description('Test connection to MCP server')
  .option('-s, --server <url>', 'MCP server URL', 'http://localhost:3003')
  .option('-t, --transport <type>', 'Transport type (http|stdio)', 'http')
  .action(async (options) => {
    try {
      console.log(`🔗 Probando conexión a: ${options.server}`);
      
      const extractor = new MCPToolsExtractor();
      await extractor.connectToServer(options.server, options.transport);
      
      const serverInfo = extractor.serverInfo;
      
      console.log('✅ Conexión exitosa!');
      console.log(`📊 Información del servidor:`);
      console.log(`   - Nombre: ${serverInfo?.name || 'Unknown'}`);
      console.log(`   - Versión: ${serverInfo?.version || 'Unknown'}`);
      
      // Probar capacidades
      const [tools, resources, prompts] = await Promise.all([
        extractor.listTools().catch(() => []),
        extractor.listResources().catch(() => []),
        extractor.listPrompts().catch(() => [])
      ]);
      
      console.log(`   - Tools: ${tools.length}`);
      console.log(`   - Resources: ${resources.length}`);
      console.log(`   - Prompts: ${prompts.length}`);
      
      await extractor.disconnect();
      
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      process.exit(1);
    }
  });

/**
 * Comando: generar configuración híbrida
 */
program
  .command('hybrid')
  .description('Generate hybrid configuration with multiple MCP servers')
  .option('-c, --config <file>', 'Configuration file with servers list')
  .option('-o, --output <file>', 'Output configuration file', 'hybrid_functions.json')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (options) => {
    try {
      // Configuración por defecto si no se proporciona archivo
      const defaultConfig = {
        servers: [
          {
            name: 'devops-mcp',
            url: 'http://localhost:3003',
            transport: 'http'
          }
        ]
      };
      
      let config = defaultConfig;
      
      if (options.config) {
        const { readFile } = await import('fs/promises');
        const configData = await readFile(options.config, 'utf8');
        config = JSON.parse(configData);
      }
      
      console.log(`🔧 Generando configuración híbrida con ${config.servers.length} servidor(es)`);
      
      const mcpHandler = getMCPFunctionHandler();
      const allFunctions = {};
      const serverStats = {};
      
      // Registrar cada servidor
      for (const serverConfig of config.servers) {
        try {
          const result = await mcpHandler.registerServer(
            serverConfig.name,
            serverConfig.url,
            serverConfig.transport
          );
          
          serverStats[result.serverName] = {
            toolsCount: result.toolsCount,
            status: 'connected'
          };
          
        } catch (error) {
          console.warn(`⚠️ No se pudo conectar a ${serverConfig.name}: ${error.message}`);
          serverStats[serverConfig.name] = {
            toolsCount: 0,
            status: 'error',
            error: error.message
          };
        }
      }
      
      // Obtener configuración combinada
      const hybridConfig = mcpHandler.exportConfiguration();
      
      const output = {
        type: 'hybrid',
        generatedAt: new Date().toISOString(),
        servers: serverStats,
        functions: hybridConfig.functions,
        metadata: hybridConfig.metadata
      };
      
      // Guardar archivo
      const jsonOutput = JSON.stringify(output, null, options.pretty ? 2 : 0);
      await writeFile(options.output, jsonOutput);
      
      console.log(`💾 Configuración híbrida guardada en: ${options.output}`);
      console.log(`📈 Resumen:`);
      console.log(`   - Servidores: ${Object.keys(serverStats).length}`);
      console.log(`   - Funciones totales: ${hybridConfig.metadata.totalFunctions}`);
      
      // Cleanup
      await mcpHandler.disconnectAll();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  process.exit(1);
});

// Ejecutar programa
program.parse();