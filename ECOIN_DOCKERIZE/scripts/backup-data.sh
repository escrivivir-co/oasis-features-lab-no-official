#!/bin/bash
# ECOin backup script

# Create backups directory if it doesn't exist
mkdir -p ./backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "./backups/ecoin-data-${TIMESTAMP}.tar.gz" -C ./volumes ecoin-data

echo "Backup created: ./backups/ecoin-data-${TIMESTAMP}.tar.gz"