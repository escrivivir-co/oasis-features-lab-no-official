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

    console.log("With context", context);
    return context;
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

    console.log("with llamaT", llamaT);
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

    this.session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      chatWrapper: new MyCustomChatWrapper(),
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

  async chat(prompt, functions = null) {
    if (!this.ready) {
      await this.initialize();
    }

    console.log(
      "\nFinal prompt",
      prompt,
      "Functions: ",
      functions,
      "\n\n Going to local model"
    );
    const answer = await this.session.prompt(prompt, { functions });
    console.log("\n\nBack from local model", answer);

    return answer;
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
