# =============================================================================
# OASIS Docker - Dockerfile Limpio Integrado
# Versión unificada que integra todos los scripts nativos
# =============================================================================

FROM node:20-bookworm-slim

# Instalar dependencias del sistema necesarias para SSB y node-llama-cpp
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    python3 \
    python3-pip \
    build-essential \
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

# Instalar dependencias base del servidor como usuario oasis
WORKDIR /app/src/server
RUN npm install --no-bin-links --ignore-scripts

# Exponer puertos
EXPOSE 8008 3000 4001

# Punto de entrada integrado
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["full"]