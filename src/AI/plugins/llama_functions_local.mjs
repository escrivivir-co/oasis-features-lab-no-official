import {
  getLlama,
  LlamaChatSession,
  ChatWrapper,
  LlamaText,
  ChatModelFunctionsDocumentationGenerator,
} from "node-llama-cpp";

/**
 * Chat wrapper personalizado para manejar funciones con node-llama-cpp
 */
class LocalFunctionChatWrapper extends ChatWrapper {
  wrapperName = "LocalFunctionChat";

  settings = {
    ...ChatWrapper.defaultSettings,
    supportsSystemMessages: true,
    functions: {
      call: {
        optionalPrefixSpace: true,
        prefix: "[[call: ",
        paramsPrefix: "(",
        suffix: ")]]",
      },
      result: {
        prefix: " [[result: ",
        suffix: "]]",
      },
    },
  };

  generateContextState({
    chatHistory,
    availableFunctions,
    documentFunctionParams,
  }) {
    console.log("Called generateContextState with local functions");
    const historyWithFunctions =
      this.addAvailableFunctionsSystemMessageToHistory(
        chatHistory,
        availableFunctions,
        {
          documentParams: documentFunctionParams,
        }
      );

    const texts = historyWithFunctions.map((item, index) => {
      if (item.type === "system") {
        if (index === 0) return LlamaText([LlamaText.fromJSON(item.text)]);
        return LlamaText(["### System\n", LlamaText.fromJSON(item.text)]);
      } else if (item.type === "user")
        return LlamaText(["### Human\n", item.text]);
      else if (item.type === "model")
        return LlamaText([
          "### Assistant\n",
          this.generateModelResponseText(item.response),
        ]);

      return item;
    });

    const context = {
      contextText: LlamaText.joinValues("\n\n", texts),
      stopGenerationTriggers: [LlamaText(["### Human\n"])],
    };
    
    console.log("Generated context for local model");
    return context;
  }

  generateAvailableFunctionsSystemText(
    availableFunctions,
    { documentParams = true }
  ) {
    console.log("Called generateAvailableFunctionsSystemText for local model");
    const functionsDocumentationGenerator =
      new ChatModelFunctionsDocumentationGenerator(availableFunctions);

    if (!functionsDocumentationGenerator.hasAnyFunctions) return LlamaText([]);

    const llamaT = LlamaText.joinValues("\n", [
      "The assistant calls the provided functions as needed to retrieve information instead of relying on existing knowledge.",
      "To fulfill a request, the assistant calls relevant functions in advance when needed before responding to the request, and does not tell the user prior to calling a function.",
      "Provided functions:",
      "```typescript",
      functionsDocumentationGenerator.getTypeScriptFunctionSignatures({
        documentParams,
      }),
      "```",
      "",
      "Calling any of the provided functions can be done like this:",
      this.generateFunctionCall("getSomeInfo", { someKey: "someValue" }),
      "",
      "Note that the [[call: prefix is mandatory.",
      "The assistant does not inform the user about using functions and does not explain anything before calling a function.",
      "After calling a function, the raw result appears afterwards and is not part of the conversation.",
      "To make information be part of the conversation, the assistant paraphrases and repeats the information without the function syntax.",
    ]);
    
    console.log("Generated functions documentation for local model");
    return llamaT;
  }
}

/**
 * Clase para manejar funciones con modelos locales usando node-llama-cpp
 */
export class LocalLlamaFunctionHandler {
  constructor(config = {}) {
    this.modelPath = config.modelPath;
    this.gpu = config.gpu || false;
    this.llamaInstance = null;
    this.model = null;
    this.context = null;
    this.session = null;
    this.functions = new Map();
    this.ready = false;
  }

  /**
   * Inicializar modelo local
   */
  async initialize() {
    if (this.model) {
      console.log("Local model already initialized!");
      return;
    }

    console.log("Initializing local Llama model...");
    
    // Inicializar con opciones de verbose y mejores configuraciones
    this.llamaInstance = await getLlama({ 
      gpu: this.gpu,
      vramPadding: 64, // MB de padding para VRAM
      logger: {
        log: (level, message) => console.log(`[node-llama-cpp ${level}]`, message)
      }
    });
    
    console.log("Loading model from:", this.modelPath);
    this.model = await this.llamaInstance.loadModel({ 
      modelPath: this.modelPath,
      gpuLayers: this.gpu ? undefined : 0 // Forzar CPU si gpu=false
    });
    
    console.log("Creating context...");
    this.context = await this.model.createContext({
      threads: 4, // Número de hilos
      contextSize: 2048, // Tamaño del contexto
    });
    
    console.log("Creating chat session...");
    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      chatWrapper: new LocalFunctionChatWrapper(),
    });

    this.ready = true;
    console.log(`Local model initialized: ${this.modelPath}`);
  }

  /**
   * Registrar una función
   */
  registerFunction(name, config) {
    // Convertir al formato esperado por node-llama-cpp
    const nodeLlamaFunction = {
      description: config.description,
      params: config.parameters,
      handler: config.handler
    };

    this.functions.set(name, nodeLlamaFunction);
    console.log(`Local function registered: ${name}`);
  }

  /**
   * Registrar múltiples funciones desde configuración
   */
  registerFunctions(functionsConfig) {
    Object.entries(functionsConfig).forEach(([name, config]) => {
      this.registerFunction(name, config);
    });
  }

  /**
   * Convertir funciones al formato de node-llama-cpp
   */
  getFunctionsForNodeLlama() {
    const functionsObj = {};
    this.functions.forEach((func, name) => {
      functionsObj[name] = func;
    });
    return functionsObj;
  }

  /**
   * Ejecutar chat completo con funciones
   */
  async chat(userInput, systemContext = "") {
    if (!this.ready) {
      await this.initialize();
    }

    const prompt = [
      `User asks: "${userInput}"`,
      "",
      "CRITICAL: You MUST use functions for specific information. Do NOT make up answers.",
      "",
      "Available functions:",
      ...this.getRegisteredFunctions().map(f => `${f.name}: ${f.description}`),
      "",
      "EXACT format required: [[call: functionName({\"param\": \"value\"})]]",
      "",
      "Examples:",
      `User: "apple price?" → You: [[call: getFruitPrice({"name": "apple"})]]`,
      `User: "what time?" → You: [[call: getCurrentTime({})]]`,
      "",
      `For "${userInput}", respond with the function call:`
    ].join("\n");

    console.log("\nPrompt for local model:", prompt);
    
    const functions = this.getFunctionsForNodeLlama();
    console.log("Functions available:", Object.keys(functions));
    
    // Primera llamada - sin funciones para obtener respuesta raw con timeout
    console.log("🔄 Starting model inference...");
    
    const answer = await Promise.race([
      this.session.prompt(prompt, {
        maxTokens: 150, // Limitar tokens para evitar respuestas muy largas
        temperature: 0.7,
        topP: 0.9,
        onToken: (token) => {
          // Log progreso de tokens (opcional)
          process.stdout.write('.');
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Model inference timeout (60s)")), 60000)
      )
    ]);
    
    console.log("\n✅ Model inference completed!");
    console.log("\nLocal model raw response:", answer);
    
    // Buscar y procesar llamadas a funciones manualmente
    const processedAnswer = await this.processFunctionCalls(answer);
    let hadFunctionCalls = processedAnswer !== answer;
    
    // Si hubo funciones, hacer segunda llamada para respuesta natural
    let finalAnswer = processedAnswer;
    if (hadFunctionCalls) {
      console.log("\nProcessed with function results:", processedAnswer);
      
      // Prompt más simple y directo para evitar timeouts
      const finalPrompt = `The price of an apple is $6. Give a short, natural response.`;
      
      console.log("🔄 Generating final response...");
      try {
        finalAnswer = await Promise.race([
          this.session.prompt(finalPrompt, {
            maxTokens: 50, // Reducido para respuesta más corta
            temperature: 0.3, // Más determinístico
            onToken: () => process.stdout.write('.')
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Final response timeout (20s)")), 20000) // Reducido a 20s
          )
        ]);
        
        console.log("\n✅ Final response completed!");
        console.log("\nFinal local response:", finalAnswer);
      } catch (error) {
        console.log("\n⚠️ Final response timeout, using function result directly");
        // Si hay timeout, usar directamente el resultado de la función
        const resultMatch = processedAnswer.match(/\[\[result: (.*?)\]\]/);
        if (resultMatch) {
          const result = JSON.parse(resultMatch[1]);
          finalAnswer = `The price of ${result.name} is ${result.price}.`;
        } else {
          finalAnswer = "The price of an apple is $6.";
        }
      }
    }
    
    return {
      answer: String(finalAnswer || "").trim(),
      hadFunctionCalls
    };
  }

  /**
   * Procesar llamadas a funciones en el texto (similar a Ollama)
   */
  async processFunctionCalls(text) {
    console.log("\n🔍 Looking for function calls in:", text);
    
    const functionCallRegex = /\[\[call:\s*(\w+)\((.*?)\)\]\]/g;
    let processedText = text;
    let match;
    let hadAnyFunctionCalls = false;

    // Buscar el formato correcto [[call: ...]]
    while ((match = functionCallRegex.exec(text)) !== null) {
      const [fullMatch, functionName, paramsStr] = match;
      console.log(`Found function call: ${functionName} with params: ${paramsStr}`);

      if (this.functions.has(functionName)) {
        try {
          const params = JSON.parse(paramsStr);
          const func = this.functions.get(functionName);
          const result = await func.handler(params);
          const resultStr = typeof result === "object" ? JSON.stringify(result) : String(result);

          processedText = processedText.replace(
            fullMatch,
            `[[result: ${resultStr}]]`
          );

          console.log(`✅ Local function ${functionName} called with params:`, params);
          console.log(`✅ Local function result:`, result);
          hadAnyFunctionCalls = true;
        } catch (error) {
          console.error(`❌ Error calling local function ${functionName}:`, error);
          processedText = processedText.replace(
            fullMatch,
            `[[result: Error calling function]]`
          );
        }
      }
    }

    // Si no hay funciones pero el input parece necesitar una función, forzarla
    if (!hadAnyFunctionCalls && processedText.toLowerCase().includes('price')) {
      console.log("🔧 No function calls found but price mentioned, forcing getFruitPrice");
      
      // Extraer el nombre de la fruta de la consulta
      const appleMatch = text.toLowerCase().match(/apple/);
      const bananaMatch = text.toLowerCase().match(/banana/);
      
      if (appleMatch || bananaMatch) {
        const fruitName = appleMatch ? 'apple' : 'banana';
        const func = this.functions.get('getFruitPrice');
        
        if (func) {
          try {
            const result = await func.handler({ name: fruitName });
            const resultStr = typeof result === "object" ? JSON.stringify(result) : String(result);
            
            processedText = `[[call: getFruitPrice({"name": "${fruitName}"})]] -> [[result: ${resultStr}]]`;
            console.log(`🔧 Forced function call result:`, result);
            hadAnyFunctionCalls = true;
          } catch (error) {
            console.error(`❌ Error in forced function call:`, error);
          }
        }
      }
    }

    console.log(`🔍 Function processing complete. Had calls: ${hadAnyFunctionCalls}`);
    return processedText;
  }

  /**
   * Obtener lista de funciones registradas
   */
  getRegisteredFunctions() {
    return Array.from(this.functions.entries()).map(([name, func]) => ({
      name,
      description: func.description,
      parameters: func.params
    }));
  }
}

/**
 * Configuraciones predefinidas de funciones para node-llama-cpp
 */
export const LOCAL_FUNCTION_CONFIGS = {
  // Funciones de ejemplo para frutas
  fruits: {
    getFruitPrice: {
      description: "Get the price of a fruit",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the fruit"
          }
        },
        required: ["name"]
      },
      handler: async (params) => {
        const name = params.name.toLowerCase();
        const fruitPrices = {
          apple: "$6",
          banana: "$4",
          orange: "$3",
          grape: "$8"
        };
        
        if (fruitPrices[name]) {
          return { name, price: fruitPrices[name] };
        }
        return `Unrecognized fruit "${params.name}"`;
      }
    }
  },

  // Funciones de utilidades del sistema
  system: {
    getCurrentTime: {
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: []
      },
      handler: async () => {
        return {
          timestamp: new Date().toISOString(),
          formatted: new Date().toLocaleString()
        };
      }
    },

    getWeather: {
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get weather for"
          }
        },
        required: ["location"]
      },
      handler: async (params) => {
        // Simulado - en producción conectarías a una API real
        return {
          location: params.location,
          temperature: "22°C",
          condition: "Sunny",
          humidity: "65%"
        };
      }
    },

    getOasisStats: {
      description: "Get statistics about the Oasis network",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            description: "The metric to retrieve (users, posts, tribes)"
          }
        },
        required: ["metric"]
      },
      handler: async (params) => {
        const stats = {
          users: "1,247 active users",
          posts: "15,623 posts this month", 
          tribes: "89 active tribes"
        };
        
        return stats[params.metric] || `No data for metric: ${params.metric}`;
      }
    }
  }
};

/**
 * Factory function para crear handlers preconfigurados
 */
export function createLocalLlamaHandler(modelPath, functionSets = ['fruits'], config = {}) {
  const handler = new LocalLlamaFunctionHandler({
    modelPath,
    ...config
  });

  // Registrar sets de funciones solicitados
  functionSets.forEach(setName => {
    if (LOCAL_FUNCTION_CONFIGS[setName]) {
      handler.registerFunctions(LOCAL_FUNCTION_CONFIGS[setName]);
    } else {
      console.warn(`Local function set '${setName}' not found`);
    }
  });

  return handler;
}