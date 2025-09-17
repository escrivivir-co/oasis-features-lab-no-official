#!/bin/bash

# Crear estructura de directorios
mkdir -p volumes/{ssb-keys,ssb-data,ssb-blobs,ssb-gossip,ai-models,configs,logs,temp}

# Establecer permisos apropiados
chmod 755 volumes/
chmod 700 volumes/ssb-keys
chmod 755 volumes/ssb-data volumes/ssb-blobs volumes/ai-models volumes/configs
chmod 777 volumes/logs volumes/temp

echo "Estructura de volúmenes creada:"
echo "- volumes/ssb-keys/     <- Llaves SSB (CRÍTICO - hacer backup)"
echo "- volumes/ssb-data/     <- Base de datos SSB"
echo "- volumes/ssb-blobs/    <- Archivos adjuntos"
echo "- volumes/ai-models/    <- Modelo GGUF de IA"
echo "- volumes/configs/      <- Configuraciones"
echo "- volumes/logs/         <- Logs de aplicación"