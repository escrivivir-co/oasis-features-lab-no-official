#!/bin/bash

# Crear estructura de directorios
mkdir -p volumes/{ssb-data,ai-models,configs,logs}

# Establecer permisos apropiados
chmod 755 volumes/
chmod 700 volumes/ssb-data
chmod 755 volumes/ai-models volumes/configs
chmod 777 volumes/logs 

echo "Estructura de volúmenes creada:"
echo "- volumes/ssb-data/     <- BD"
echo "- volumes/ai-models/    <- Modelo GGUF de IA"
echo "- volumes/configs/      <- Configuraciones"
echo "- volumes/logs/         <- Logs de aplicación"