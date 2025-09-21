
#!/bin/bash

# Script para probar el servicio AI usando curl
# Transformado desde JavaScript/axios a bash/curl

# Variables de configuración
# Usar host.docker.internal para acceder al host desde el contenedor
AI_HOST="host.docker.internal"
AI_PORT="4001"
HEALTH_URL="http://${AI_HOST}:${AI_PORT}/health"
AI_URL="http://${AI_HOST}:${AI_PORT}/ai"

# Datos para la petición
INPUT="Gather some information on my server to get status!"
CONTEXT=""
PROMPT="You are a helpful assistant that helps users gather information about their server status. Provide clear and concise information based on the user's request."

echo "🤖 Verificando que el servicio AI esté disponible..."

# Verificar que el servicio AI esté disponible (health check)
if ! curl -s --max-time 2 "${HEALTH_URL}" > /dev/null 2>&1; then
    echo "❌ Servicio AI no disponible en ${HEALTH_URL}"
    exit 1
fi

echo "✅ Servicio AI disponible"
echo "🤖 Enviando petición al servicio AI..."

# Crear el JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
    "input": "${INPUT}",
    "context": "${CONTEXT}",
    "prompt": "${PROMPT}"
}
EOF
)

# Enviar petición POST al servicio AI
RESPONSE=$(curl -s \
    --max-time 120 \
    --header "Content-Type: application/json" \
    --data "${JSON_PAYLOAD}" \
    "${AI_URL}")

# Verificar si la petición fue exitosa
if [ $? -eq 0 ]; then
    echo "🤖 Respuesta recibida del servicio AI:"
    echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
else
    echo "❌ Error durante la petición al servicio AI"
    exit 1
fi