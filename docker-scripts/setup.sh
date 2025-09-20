#!/bin/bash

# Crear estructura de directorios
mkdir -p volumes-dev/{ssb-data,ai-models,configs,logs}

# Establecer permisos apropiados
chmod 755 volumes-dev/
chmod 700 volumes-dev/ssb-data
chmod 755 volumes-dev/ai-models volumes-dev/configs
chmod 777 volumes-dev/logs 

echo "Estructura de volúmenes creada:"
echo "- volumes-dev/ssb-data/     <- BD similar to Settings/downloaddb"
echo "- volumes-dev/ai-models/    <- Modelo GGUF de IA"
echo "- volumes-dev/configs/      <- Configurations"
echo "- volumes-dev/logs/         <- Logs"