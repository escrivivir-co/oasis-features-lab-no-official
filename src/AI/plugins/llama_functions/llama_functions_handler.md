# Call & results

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis/src/AI/plugins (feature/ai-functions)
$ sh test_llama_functions.sh 
🧪 Testing implementations...
==================================================
=== Test 1: /ai llama_functions : true ===
{"answer":"You: \"The price of an apple is $6.\"","snippets":[],"hadFunctionCalls":true,"mode":"dev"}

```


# Service logs
```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis/src/AI/plugins (feature/ai-functions)
$ node ../ai_service.mjs 
🚀 AI Service starting on port 4001
📍 Available modes:
  • Default: POST /ai {"input": "question"}
  • Functions Prod: POST /ai {"input": "question", "node_llama_cpp_functions": true}
  • Functions Dev: POST /ai {"input": "question", "llama_functions": true}
  • No Functions: POST /ai {"input": "question", "useFunctions": false}
Call /ai { input: 'What is the price of an apple?', llama_functions: true }
Start /ai Plugins! { input: 'What is the price of an apple?', llama_functions: true }
ROUTE FOR llama_functions_handler.mjs
Local function registered: getFruitPrice
Local function registered: getCurrentTime
Local function registered: getWeather
Local function registered: getOasisStats
Initializing local Llama model...
Loading model from: E:\LAB_AGOSTO\ORACLE_HALT_ALEPH_VERSION\oasis\oasis\src\AI\oasis-42-1-chat.Q4_K_M.gguf
Creating context...
Creating chat session...
Local model initialized: E:\LAB_AGOSTO\ORACLE_HALT_ALEPH_VERSION\oasis\oasis\src\AI\oasis-42-1-chat.Q4_K_M.gguf       
Start /ai Plugins! { input: 'What is the price of an apple?', llama_functions: true }

Prompt for local model: User asks: "What is the price of an apple?"

CRITICAL: You MUST use functions for specific information. Do NOT make up answers.

Available functions:
getFruitPrice: Get the price of a fruit
getCurrentTime: Get the current date and time
getWeather: Get weather information for a location
getOasisStats: Get statistics about the Oasis network      

EXACT format required: [[call: functionName({"param": "value"})]]

Examples:
User: "apple price?" → You: [[call: getFruitPrice({"name": "apple"})]]
User: "what time?" → You: [[call: getCurrentTime({})]]     

For "What is the price of an apple?", respond with the function call:
Functions available: [ 'getFruitPrice', 'getCurrentTime', 'getWeather', 'getOasisStats' ]
🔄 Starting model inference...
Called generateContextState with local functions
Generated context for local model
...............................................................................................................................
✅ Model inference completed!

Local model raw response: User asks: "What is the price of an apple?"

You: [[call: getFruitPrice({"name": "apple"})]]

Available functions:
getFruitPrice: Get the price of a fruit
getCurrentTime: Get the current date and time
getWeather: Get weather information for a location
getOasisStats: Get statistics about the Oasis network      

EXACT format required: [[call: functionName({"param": "value"})]]

Note: The functions are just examples, you can add or remove them as per your requirement.

🔍 Looking for function calls in: User asks: "What is the price of an apple?"

You: [[call: getFruitPrice({"name": "apple"})]]

Available functions:
getFruitPrice: Get the price of a fruit
getCurrentTime: Get the current date and time
getWeather: Get weather information for a location
getOasisStats: Get statistics about the Oasis network      

EXACT format required: [[call: functionName({"param": "value"})]]

Note: The functions are just examples, you can add or remove them as per your requirement.
Found function call: getFruitPrice with params: {"name": "apple"}
✅ Local function getFruitPrice called with params: { name:
 'apple' }
✅ Local function result: { name: 'apple', price: '$6' }   
Found function call: functionName with params: {"param": "value"}
🔍 Function processing complete. Had calls: true

Processed with function results: User asks: "What is the price of an apple?"

You: [[result: {"name":"apple","price":"$6"}]]

Available functions:
getFruitPrice: Get the price of a fruit
getCurrentTime: Get the current date and time
getWeather: Get weather information for a location
getOasisStats: Get statistics about the Oasis network      

EXACT format required: [[call: functionName({"param": "value"})]]

Note: The functions are just examples, you can add or remove them as per your requirement.
🔄 Generating final response...
Called generateContextState with local functions
Generated context for local model
.............
✅ Final response completed!

Final local response: You: "The price of an apple is $6."
```