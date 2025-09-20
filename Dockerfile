# =============================================================================
# OASIS Docker - Dockerfile Limpio Integrado
# Versión unificada que integra todos los scripts nativos
# =============================================================================

FROM node:20-bookworm-slim

# Instalar dependencias del sistema necesarias para SSB y node-llama-cpp
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    unzip \
    git \
    cmake \
    build-essential \
    python3 \
    python3-pip \
    nano \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario oasis
RUN groupadd -r oasis && useradd -r -g oasis -m oasis

# Configurar directorio de trabajo
WORKDIR /app

# Copiar código fuente completo
COPY --chown=oasis:oasis . .

# Convertir line endings y dar permisos al entrypoint
RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Cambiar al usuario oasis ANTES de instalar dependencias
USER oasis

# 🎯 Variables de entorno para node-llama-cpp
ENV NODE_LLAMA_CPP_SKIP_DOWNLOAD=false \
    NODE_LLAMA_CPP_USE_PREBUILT_BINARIES=true \
    NODE_LLAMA_CPP_BUILD_FROM_SOURCE=false

# Instalar dependencias base del servidor como usuario oasis
WORKDIR /app/src/server
RUN npm install --no-bin-links --ignore-scripts

# Instalar dependencias de AI con binarios Linux correctos
WORKDIR /app/src/AI
RUN npm install --no-bin-links --ignore-scripts && \
    npm install @node-llama-cpp/linux-x64-cuda @node-llama-cpp/linux-x64 --save-optional

# Exponer puertos
EXPOSE 8008 3000 4001

# Punto de entrada integrado
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["full"]