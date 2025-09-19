# MCP-to-Llama Parser

Parser que convierte tools de servidores MCP al formato compatible con `node-llama-cpp` functions, permitiendo funciones híbridas locales + MCP.

## Características

- ✅ Extracción automática de tools desde servidores MCP
- ✅ Conversión a formato compatible con `node-llama-cpp`
- ✅ Funciones híbridas (locales + MCP)
- ✅ Nomenclatura `servidor.tool` para funciones MCP
- ✅ CLI para consulta y generación de configuraciones
- ✅ Soporte para múltiples servidores MCP

## Instalación

```bash
npm install
```

Dependencias añadidas:
- `@modelcontextprotocol/sdk`: SDK oficial de MCP
- `commander`: Para CLI

## Uso Básico

### 1. CLI - Query Server

```bash
# Probar conexión a servidor MCP
npm run query-server -- test -s http://localhost:3003

# Listar tools disponibles
npm run query-server -- list -s http://localhost:3003

# Extraer tools y generar JSON
npm run query-server -- extract -s http://localhost:3003 -o functions.json

# Generar configuración híbrida
npm run query-server -- hybrid -o hybrid_config.json
```

### 2. Handler Híbrido en Código

```javascript
import { createHybridHandler, HYBRID_PRESETS } from './plugins/hybrid_llama_handler.mjs';

// Handler con funciones locales + MCP
const handler = await createHybridHandler({
  modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
  localFunctions: ['fruits', 'system'],
  mcpServers: [
    {
      name: 'devops-mcp',
      url: 'http://localhost:3003',
      transport: 'sse'
    }
  ]
});

// Chat con funciones híbridas
const response = await handler.chat('¿Cuál es el precio de una manzana?');
console.log(response);

// Estadísticas
const stats = handler.getFunctionStats();
console.log(`Total funciones: ${stats.total}`);
console.log(`Locales: ${stats.local.count}, MCP: ${stats.mcp.count}`);
```

### 3. Presets Disponibles

```javascript
import { HYBRID_PRESETS } from './plugins/hybrid_llama_handler.mjs';

// Solo funciones locales
const localHandler = await createHybridHandler({
  modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
  ...HYBRID_PRESETS.local
});

// Con servidor de desarrollo
const devHandler = await createHybridHandler({
  modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
  ...HYBRID_PRESETS.development
});
```

## Arquitectura

### Componentes Principales

1. **MCPToolsExtractor** (`mcp_tools_extractor.mjs`)
   - Conexión a servidores MCP via SDK oficial
   - Extracción de tools, resources y prompts

2. **MCPSchemaTransformer** (`mcp_schema_transformer.mjs`)
   - Conversión de schemas MCP a formato node-llama-cpp
   - Generación de nombres `servidor.tool`

3. **MCPFunctionHandler** (`mcp_function_handler.mjs`)
   - Ejecución de tools MCP desde node-llama-cpp
   - Gestión de múltiples servidores

4. **HybridLlamaFunctionHandler** (`hybrid_llama_handler.mjs`)
   - Combinación de funciones locales + MCP
   - Extensión de `LocalLlamaFunctionHandler`

### Flujo de Datos

```
Servidor MCP → MCPToolsExtractor → MCPSchemaTransformer → node-llama-cpp functions
                                                       ↓
                                              HybridLlamaFunctionHandler
                                                       ↓
                                              Chat con funciones híbridas
```

## Formato de Funciones

### Funciones Locales (existentes)
```javascript
{
  "fruits": {
    "getFruitPrice": {
      "description": "Get the price of a fruit",
      "parameters": { /* JSON Schema */ },
      "handler": async (params) => { /* ... */ }
    }
  }
}
```

### Funciones MCP (generadas)
```javascript
{
  "devops-mcp": {
    "add_prompt": {
      "description": "Añadir un nuevo prompt al servidor",
      "parameters": { /* JSON Schema convertido */ },
      "handler": async (params) => { /* ejecuta via MCP */ }
    }
  }
}
```

### Nombre Final en node-llama-cpp
- Local: `getFruitPrice`
- MCP: `devops-mcp_add_prompt`

## Configuración de Servidores

### Archivo de configuración (opcional)
```json
{
  "servers": [
    {
      "name": "devops-mcp",
      "url": "http://localhost:3003",
      "transport": "sse"
    },
    {
      "name": "wiki-mcp", 
      "url": "http://localhost:3004",
      "transport": "sse"
    }
  ]
}
```

## Scripts Disponibles

- `npm run query-server`: CLI para consultar servidores MCP
- `npm run test:mcp`: Suite de pruebas de integración

## Ejemplos de Uso

### Consultar Servidor MCP
```bash
# Verificar servidor
npm run query-server -- test -s http://localhost:3003

# Ver tools disponibles
npm run query-server -- list -s http://localhost:3003 --detailed

# Extraer configuración completa
npm run query-server -- extract -s http://localhost:3003 -o config.json --pretty
```

### Usar en Código
```javascript
// Ejemplo básico
const handler = await createHybridHandler({
  modelPath: './models/oasis-42-1-chat.Q4_K_M.gguf',
  localFunctions: ['system'],
  mcpServers: [
    { name: 'devops', url: 'http://localhost:3003', transport: 'sse' }
  ]
});

const response = await handler.chat('¿Qué hora es?');
// Usará función local getCurrentTime

const mcpResponse = await handler.chat('Añade un prompt llamado "test"');
// Usará función MCP devops.add_prompt
```

## Troubleshooting

### Error de Conexión MCP
- Verificar que el servidor MCP esté ejecutándose
- Comprobar URL y puerto correcto
- Usar `npm run query-server -- test` para diagnóstico

### Funciones No Disponibles
- Verificar que el servidor MCP exponga las tools correctamente
- Revisar logs de transformación de schemas
- Usar `--validate` en el CLI para validar funciones

### Problemas de Compatibilidad
- Asegurar que `@modelcontextprotocol/sdk` esté instalado
- Verificar versión de Node.js (>=18.0.0)
- Comprobar formato de parámetros JSON Schema

## Desarrollo

### Estructura de Archivos
```
plugins/
├── mcp_tools_extractor.mjs      # Cliente MCP base
├── mcp_schema_transformer.mjs   # Transformador de schemas  
├── mcp_function_handler.mjs     # Handler genérico MCP
├── hybrid_llama_handler.mjs     # Handler híbrido
├── mcp_query_server.mjs         # CLI principal
└── test_mcp_integration.mjs     # Suite de pruebas
```

### Extender Funcionalidad
1. Añadir soporte para nuevos transportes en `MCPToolsExtractor`
2. Mejorar transformación de schemas en `MCPSchemaTransformer`
3. Añadir nuevos presets en `HYBRID_PRESETS`

---

**¡Listo para usar!** 🚀

El parser MCP-to-Llama está implementado y funcional. Permite extracción automática de tools desde cualquier servidor MCP y su uso transparente en `node-llama-cpp` con funciones híbridas.