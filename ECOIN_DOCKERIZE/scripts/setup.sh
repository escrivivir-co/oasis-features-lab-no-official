#!/bin/bash

# ECOin Docker Setup Script
# This script helps with initial setup of the ECOin dockerized environment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[Setup]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[Setup]${NC} $1"
}

error() {
    echo -e "${RED}[Setup]${NC} $1"
    exit 1
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    log "Docker and Docker Compose are installed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p volumes/ecoin-data
    mkdir -p volumes/ecoin-gui-data
    mkdir -p volumes/logs
    mkdir -p volumes/gui-logs
    mkdir -p backups
    
    log "Directories created successfully"
}

# Copy environment file
setup_env() {
    if [ ! -f .env ]; then
        log "Creating .env file from template..."
        cp .env.example .env
        warn "Please review and modify .env file as needed"
    else
        warn ".env file already exists"
    fi
}

# Set proper permissions
set_permissions() {
    log "Setting proper permissions..."
    chmod +x scripts/entrypoint.sh
    chmod 644 .env.example
    
    # Set ownership for volume directories
    if [ -d "volumes" ]; then
        find volumes -type d -exec chmod 755 {} \;
        find volumes -type f -exec chmod 644 {} \;
    fi
    
    log "Permissions set successfully"
}

# Main setup function
main() {
    log "Starting ECOin Docker setup..."
    
    check_docker
    create_directories
    setup_env
    set_permissions
    
    log "Setup completed successfully!"
    log ""
    log "Next steps:"
    log "1. Review and modify .env file if needed"
    log "2. Run 'npm run build' to build the Docker image"
    log "3. Run 'npm run start' to start the ECOin wallet"
    log "4. Use 'npm run logs' to view logs"
    log ""
    log "For more information, check the README.md file"
}

# Run main function
main "$@"