#!/usr/bin/env node

// Test script para verificar que ai_service_standalone.mjs funciona correctamente

const axios = require('axios');
const path = require('path');

const AI_SERVICE_URL = 'http://localhost:4001';

async function testAIService() {
    console.log('🧪 Testing AI Service Standalone...\n');

    // Test 1: Health Check
    try {
        console.log('1. Testing health endpoint...');
        const healthResponse = await axios.get(`${AI_SERVICE_URL}/health`);
        console.log('✅ Health check OK:', healthResponse.data);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return;
    }

    // Test 2: Status Check
    try {
        console.log('\n2. Testing status endpoint...');
        const statusResponse = await axios.get(`${AI_SERVICE_URL}/status`);
        console.log('✅ Status check OK:', statusResponse.data);
    } catch (error) {
        console.log('❌ Status check failed:', error.message);
    }

    // Test 3: Basic AI Query
    try {
        console.log('\n3. Testing basic AI query...');
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai`, {
            input: 'Hello, how are you?',
            context: 'Test context from test script',
            prompt: 'Respond briefly and politely.'
        });
        console.log('✅ AI query OK');
        console.log('Response:', aiResponse.data.answer.slice(0, 100) + '...');
        console.log('Mode:', aiResponse.data.mode);
    } catch (error) {
        console.log('❌ AI query failed:', error.message);
    }

    // Test 4: Functions mode (if available)
    try {
        console.log('\n4. Testing functions mode...');
        const functionsResponse = await axios.post(`${AI_SERVICE_URL}/ai`, {
            input: 'What functions are available?',
            context: 'Testing functions context',
            node_llama_cpp_functions: true
        });
        console.log('✅ Functions query OK');
        console.log('Response mode:', functionsResponse.data.mode);
        console.log('Had function calls:', functionsResponse.data.hadFunctionCalls);
    } catch (error) {
        console.log('⚠️ Functions test failed (might be expected):', error.message);
    }

    console.log('\n🎉 AI Service Standalone testing completed!');
}

// Run tests
testAIService().catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
});