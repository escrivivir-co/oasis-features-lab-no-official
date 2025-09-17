#!/bin/bash

# Backup de llaves SSB (CRÍTICO)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copiar llaves
cp -r volumes/ssb-keys/* "$BACKUP_DIR/"

# Crear archivo comprimido
tar -czf "$BACKUP_DIR.tar.gz" -C backups $(basename "$BACKUP_DIR")
rm -rf "$BACKUP_DIR"

echo "Backup de llaves creado: $BACKUP_DIR.tar.gz"
echo "¡GUARDA ESTE ARCHIVO EN LUGAR SEGURO!"