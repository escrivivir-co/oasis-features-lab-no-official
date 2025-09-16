import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getLlama,
  LlamaChatSession,
  ChatWrapper,
  LlamaText,
  ChatModelFunctionsDocumentationGenerator,
} from "node-llama-cpp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            description: "The name of the fruit",
          },
        },
        required: ["name"],
      },
      handler: async (params) => {
        const name = params.name.toLowerCase();
        const fruitPrices = {
          apple: "$6",
          banana: "$4",
          orange: "$3",
          grape: "$8",
        };

        if (fruitPrices[name]) {
          return { name, price: fruitPrices[name] };
        }
        return `Unrecognized fruit "${params.name}"`;
      },
    },
  },

  // Funciones de utilidades del sistema
  system: {
    getCurrentTime: {
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        return {
          timestamp: new Date().toISOString(),
          formatted: new Date().toLocaleString(),
        };
      },
    },

    getWeather: {
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get weather for",
          },
        },
        required: ["location"],
      },
      handler: async (params) => {
        // Simulado - en producción conectarías a una API real
        return {
          location: params.location,
          temperature: "22°C",
          condition: "Sunny",
          humidity: "65%",
        };
      },
    },

    getOasisStats: {
      description: "Get statistics about the Oasis network",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            description: "The metric to retrieve (users, posts, tribes)",
          },
        },
        required: ["metric"],
      },
      handler: async (params) => {
        const stats = {
          users: "1,247 active users",
          posts: "15,623 posts this month",
          tribes: "89 active tribes",
        };

        return stats[params.metric] || `No data for metric: ${params.metric}`;
      },
    },
  },
};
/**
 * Chat wrapper personalizado para el modelo local
 */
class MyCustomChatWrapper extends ChatWrapper {
  wrapperName = "MyCustomChat";
  userContext = "";

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
    console.log("Called generateContextState");

    // Modificar el sistema base para ser más directo con las funciones
    const baseSystemMessage =
      availableFunctions && Object.keys(availableFunctions).length > 0
        ? "You are a function-calling assistant. You MUST use the provided functions to answer questions. Never provide general responses when a function can provide specific information."
        : "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.";

    const historyWithFunctions =
      this.addAvailableFunctionsSystemMessageToHistory(
        chatHistory,
        availableFunctions,
        {
          documentParams: documentFunctionParams,
        }
      );

    // Modificar el primer mensaje del sistema si hay funciones disponibles
    if (
      historyWithFunctions.length > 0 &&
      historyWithFunctions[0].type === "system"
    ) {
      historyWithFunctions[0].text = baseSystemMessage;
    }

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

    // console.log("With context", context);
    return context + " " + this.userContext;
  }

  generateAvailableFunctionsSystemText(
    availableFunctions,
    { documentParams = true }
  ) {
    console.log("Called generateAvailableFunctionsSystemText");
    const functionsDocumentationGenerator =
      new ChatModelFunctionsDocumentationGenerator(availableFunctions);

    if (!functionsDocumentationGenerator.hasAnyFunctions) return LlamaText([]);

    const llamaT = LlamaText.joinValues("\n", [
      "CRITICAL: You MUST use the provided functions to answer questions. Do NOT provide general responses.",
      "",
      "When asked about prices, weather, time, or specific information, you MUST call the appropriate function.",
      "",
      "Available functions:",
      "```typescript",
      functionsDocumentationGenerator.getTypeScriptFunctionSignatures({
        documentParams,
      }),
      "```",
      "",
      "EXACT FORMAT REQUIRED - Use this format exactly:",
      '[[call: getFruitPrice({"name": "apple"})]]',
      "",
      "EXAMPLES:",
      "User: What is the price of an apple?",
      'Assistant: [[call: getFruitPrice({"name": "apple"})]]',
      "",
      "User: What time is it?",
      "Assistant: [[call: getCurrentTime({})]]",
      "",
      "RULES:",
      "1. ALWAYS use functions for specific information",
      '2. Use EXACT format: [[call: functionName({"param": "value"})]]',
      "3. Do NOT explain what you're doing",
      "4. Do NOT provide general answers",
      "5. Call the function IMMEDIATELY when relevant information is requested",
    ]);

    // console.log("with llamaT", llamaT);
    return llamaT;
  }
}

/**
 * Clase para manejar el modelo local legacy
 */
export class LocalModelHandler {
  constructor() {
    this.llamaInstance = null;
    this.model = null;
    this.context = null;
    this.session = null;
    this.ready = false;
    this.functions = new Map();
    this.functionSets = ["fruits"];
  }

  async initialize() {
    if (this.model) {
      console.log("Local model already initialized");
      return;
    }

    this.initFunctions();
    const modelPath = path.join(__dirname, "..", "oasis-42-1-chat.Q4_K_M.gguf");
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found at: ${modelPath}`);
    }

    console.log("Initializing local model...");
    this.llamaInstance = await getLlama({ gpu: false });
    this.model = await this.llamaInstance.loadModel({ modelPath });
    this.context = await this.model.createContext();

    this.wrapper = new MyCustomChatWrapper();

    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      chatWrapper: this.wrapper,
    });

    this.ready = true;
    console.log("Local model initialized successfully");
  }

  initFunctions() {
    // Registrar sets de funciones solicitados
    this.functionSets.forEach((setName) => {
      if (LOCAL_FUNCTION_CONFIGS[setName]) {
        this.registerFunctions(LOCAL_FUNCTION_CONFIGS[setName]);
      } else {
        console.warn(`Local function set '${setName}' not found`);
      }
    });
    console.log(
      "ROUTE FOR local_model_handler.mjs",
      "initialize",
      "Functions",
      this.functions
    );
  }

  async chat(prompt, context, functions = null) {
    if (!this.ready) {
      await this.initialize();
    }

    this.wrapper.userContext = context;

    // ✅ Limpiar resultados anteriores
    this.lastFunctionResults = [];

    const usingFunctions =
      functions || this.getFunctionsForNodeLlamaWithInterception();
    console.log(
      "\nFinal prompt",
      prompt,
      "Functions: ",
      usingFunctions,
      "\n\n Going to local model"
    );

    const result = await this.session.prompt(prompt, {
      functions: usingFunctions,
    });
    console.log("\n\nBack from local model", result);
    console.log("Function results captured:", this.lastFunctionResults);

    // ✅ Si hay resultados de función, generar respuesta natural
    if (this.lastFunctionResults.length > 0) {
      const naturalResponse = this.generateNaturalResponseFromResults();
      return {
        answer: naturalResponse,
        hadFunctionCalls: true,
      };
    }

    return {
      answer: result || "No response generated",
      hadFunctionCalls: Object.keys(usingFunctions).length > 0,
    };
  }

  /**
   * Crear funciones con interceptación
   */
  getFunctionsForNodeLlamaWithInterception() {
    const functionsObj = {};
    this.functions.forEach((func, name) => {
      functionsObj[name] = {
        ...func,
        handler: async (params) => {
          // ✅ Interceptar llamada
          console.log(`🔧 Function called: ${name}`, params);
          const result = await func.handler(params);

          // ✅ Guardar resultado
          this.lastFunctionResults.push({
            name,
            params,
            result,
          });

          console.log(`✅ Function result: ${name}`, result);
          return result;
        },
      };
    });
    return functionsObj;
  }

  /**
   * Generar respuesta natural a partir de los resultados interceptados
   */
  generateNaturalResponseFromResults() {
    const lastResult =
      this.lastFunctionResults[this.lastFunctionResults.length - 1];

    if (!lastResult) return "Function executed successfully.";

    const { name, params, result } = lastResult;

    console.log("Natural response for", name, params, result);
    return result;
  }

  /**
   * Registrar una función
   */
  registerFunction(name, config) {
    // Convertir al formato esperado por node-llama-cpp
    const nodeLlamaFunction = {
      description: config.description,
      params: config.parameters,
      handler: config.handler,
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
}

// Instancia singleton
let localModelHandler = null;

export async function getLocalModelHandler() {
  if (!localModelHandler) {
    localModelHandler = new LocalModelHandler();
  }
  return localModelHandler;
}
