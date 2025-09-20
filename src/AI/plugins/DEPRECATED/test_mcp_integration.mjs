#!/usr/bin/env node

/**
 * Script de prueba para validar la implementación MCP-to-Llama
 */

import { createHybridHandler, HYBRID_PRESETS } from '../llama_functions_mcp_handler.mjs';
import { getMCPFunctionHandler } from '../mcp_function_handler.mjs';

async function testMCPExtraction() {
  console.log('🧪 Iniciando pruebas de extracción MCP...\n');

  try {
    // Test 1: Conectar a servidor MCP de desarrollo
    console.log('📡 Test 1: Conexión a servidor MCP');
    const mcpHandler = getMCPFunctionHandler();
    
    try {
      await mcpHandler.registerServer(
        'devops-mcp',
        'http://localhost:3003',
        'http'
      );
      console.log('✅ Servidor MCP registrado exitosamente');
    } catch (error) {
      console.log('⚠️ No se pudo conectar al servidor MCP (normal si no está ejecutándose)');
      console.log('   Para probar con servidor real, ejecuta el servidor en localhost:3003');
      return;
    }

    // Test 2: Listar funciones disponibles
    console.log('\n🔍 Test 2: Listado de funciones');
    const functions = mcpHandler.getAllFunctions();
    console.log(`Funciones MCP encontradas: ${Object.keys(functions).length}`);
    
    for (const [serverName, serverFunctions] of Object.entries(functions)) {
      console.log(`  Servidor ${serverName}:`);
      for (const toolName of Object.keys(serverFunctions)) {
        console.log(`    - ${toolName}`);
      }
    }

    // Test 3: Configuración de exportación
    console.log('\n📄 Test 3: Exportación de configuración');
    const config = mcpHandler.exportConfiguration();
    console.log(`Servidores: ${config.metadata.serversCount}`);
    console.log(`Funciones totales: ${config.metadata.totalFunctions}`);

    // Cleanup
    await mcpHandler.disconnectAll();
    console.log('\n✅ Pruebas MCP completadas exitosamente');

  } catch (error) {
    console.error('\n❌ Error en pruebas MCP:', error.message);
  }
}

async function testHybridHandler() {
  console.log('\n🔀 Iniciando pruebas de handler híbrido...\n');

  try {
    // Test 1: Handler solo con funciones locales
    console.log('🏠 Test 1: Handler con funciones locales');
    const localHandler = await createHybridHandler({
      modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
      localFunctions: ['fruits', 'system'],
      mcpServers: []
    });

    const localStats = localHandler.getFunctionStats();
    console.log(`✅ Funciones locales: ${localStats.local.count}`);
    console.log(`   - Disponibles: ${localStats.local.functions.join(', ')}`);

    // Test 2: Configuración híbrida (fallback si no hay servidor MCP)
    console.log('\n🔗 Test 2: Configuración híbrida');
    try {
      const hybridHandler = await createHybridHandler({
        modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
        ...HYBRID_PRESETS.development
      });

      const hybridStats = hybridHandler.getFunctionStats();
      console.log(`✅ Handler híbrido creado:`);
      console.log(`   - Funciones locales: ${hybridStats.local.count}`);
      console.log(`   - Funciones MCP: ${hybridStats.mcp.count}`);
      console.log(`   - Total: ${hybridStats.total}`);

      await hybridHandler.cleanup();
    } catch (error) {
      console.log('⚠️ Handler híbrido no disponible (servidor MCP no accesible)');
    }

    await localHandler.cleanup();
    console.log('\n✅ Pruebas de handler híbrido completadas');

  } catch (error) {
    console.error('\n❌ Error en pruebas híbridas:', error.message);
  }
}

async function testCLI() {
  console.log('\n⌨️ Iniciando pruebas de CLI...\n');

  console.log('📋 Comandos disponibles:');
  console.log('   npm run query-server -- extract -s http://localhost:3003');
  console.log('   npm run query-server -- list -s http://localhost:3003');
  console.log('   npm run query-server -- test -s http://localhost:3003');
  console.log('   npm run query-server -- hybrid -o hybrid_config.json');
  
  console.log('\n💡 Para probar el CLI:');
  console.log('   1. Asegúrate de que un servidor MCP esté ejecutándose');
  console.log('   2. Ejecuta: npm run query-server -- test');
  console.log('   3. Si funciona, ejecuta: npm run query-server -- extract');
}

async function main() {
  console.log('🚀 OASIS MCP-to-Llama Parser - Suite de Pruebas');
  console.log('================================================\n');

  // Ejecutar todas las pruebas
  await testMCPExtraction();
  await testHybridHandler();
  await testCLI();

  console.log('\n🎉 Suite de pruebas completada!');
  console.log('\n📖 Próximos pasos:');
  console.log('   1. Instalar dependencias: npm install');
  console.log('   2. Ejecutar servidor MCP de prueba');
  console.log('   3. Probar extracción: npm run query-server -- test');
  console.log('   4. Usar handler híbrido en tu aplicación');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}