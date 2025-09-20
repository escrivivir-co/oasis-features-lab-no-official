# Call & results

```bash
secre@ALEPH MINGW64 /e/LAB_AGOSTO/ORACLE_HALT_ALEPH_VERSION/oasis/oasis/src/AI/plugins (feature/ai-functions)
$ sh test_handler.sh
🧪 Testing implementations...==================================================
=== Test 1: /ai node_llama_cpp_functions: true ===
{"answer":{"name":"apple","price":"$6"},"snippets":[],"hadFunctionCalls":true,"mode":"prod"}

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
Call /ai { input: 'What is the price of an apple?', node_llama_cpp_functions: true }
Start /ai Plugins! { input: 'What is the price of an apple?', node_llama_cpp_functions: true }
ROUTE FOR node_llama_cpp_handler.mjs
Start /ai Plugins! { input: 'What is the price of an apple?', node_llama_cpp_functions: true }
Local function registered: getFruitPrice
 in special_eog_ids - the tokenizer config may be incorrect 
 in special_eog_ids - the tokenizer config may be incorrect

Local model initialized successfully

Final prompt What is the price of an apple? Functions:  {  
  getFruitPrice: {
    description: 'Get the price of a fruit',
    params: { type: 'object', properties: [Object], required: [Array] },
    handler: [AsyncFunction: handler]
  }
}

 Going to local model
Called generateContextState
Called generateAvailableFunctionsSystemText
Called generateContextState
Called generateAvailableFunctionsSystemText
🔧 Function called: getFruitPrice { name: 'apple' }
✅ Function result: getFruitPrice { name: 'apple', price: '$6' }
Called generateContextState
Called generateAvailableFunctionsSystemText


Back from local model 
Function results captured: [
  {
    name: 'getFruitPrice',
    params: { name: 'apple' },
    result: { name: 'apple', price: '$6' }
  }
]
Natural response for getFruitPrice { name: 'apple' } { name: 'apple', price: '$6' }
```

