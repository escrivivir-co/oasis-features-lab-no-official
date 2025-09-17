# ECOin Dockerized 🐳

> Dockerized version of ECOin P2P Crypto-Currency Wallet and Daemon

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)

## 📋 Overview

This project provides a complete dockerized environment for running ECOin (P2P Crypto-Currency) wallet, daemon, and miner. It includes persistent volumes, network access configuration, and convenient NPM scripts for container management.

**ECOin** - Copyright (c) - 2014/2025 - GPLv3 - epsylon@riseup.net (https://ecoin.03c8.net)

## ✨ Features

- 🐳 **Docker & Docker Compose** ready
- 💾 **Persistent volumes** mounted at project root
- 🌐 **Network accessible** from host and other containers  
- 📦 **NPM scripts** for easy container management
- 🖥️ **GUI support** with VNC access
- ⛏️ **CPU miner** included
- 🔒 **Security** configurations
- 📊 **Health checks** and monitoring
- 🔄 **Auto-restart** capabilities

## 🏗️ Project Structure

```
ecoin-dockerized/
├── 📁 docker/              # Docker related files
├── 📁 scripts/             # Helper scripts
│   ├── entrypoint.sh       # Container entrypoint
│   └── setup.sh           # Initial setup script
├── 📁 volumes/             # Persistent data volumes
│   ├── ecoin-data/         # ECOin daemon data
│   ├── ecoin-gui-data/     # ECOin GUI data
│   ├── logs/              # Application logs
│   └── gui-logs/          # GUI logs
├── 📁 backups/            # Backup storage
├── 🐳 Dockerfile          # Main Docker image
├── 🐳 docker-compose.yml  # Multi-container setup
├── 📦 package.json        # NPM scripts and metadata
├── ⚙️ .env.example        # Environment variables template
├── 🚫 .dockerignore       # Docker ignore rules
└── 📖 README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js & NPM (for management scripts)

### Installation

1. **Clone and setup**:
```bash
git clone <this-repository>
cd ecoin-dockerized
chmod +x scripts/setup.sh
./scripts/setup.sh
```

2. **Configure environment** (optional):
```bash
cp .env.example .env
# Edit .env file as needed
```

3. **Build and start**:
```bash
npm run build
npm run start
```

## 📦 NPM Scripts Reference

### 🏗️ Build Commands
```bash
npm run build         # Build Docker image (no cache)
npm run build:quick   # Build Docker image (with cache)
```

### 🚀 Start/Stop Commands
```bash
npm run start         # Start all services (daemon + GUI)
npm run start:daemon  # Start only ECOin daemon
npm run start:gui     # Start only ECOin GUI
npm run start:logs    # Start with console logs
npm run stop          # Stop all services
npm run stop:remove   # Stop and remove volumes
npm run restart       # Restart all services
```

### 📊 Monitoring Commands
```bash
npm run logs          # Follow all logs
npm run logs:daemon   # Follow daemon logs only
npm run logs:gui      # Follow GUI logs only
npm run logs:tail     # Show last 100 lines
npm run status        # Show container status
npm run health        # Check daemon health
```

### 🔧 Management Commands
```bash
npm run shell         # Access daemon container shell
npm run shell:gui     # Access GUI container shell
npm run clean         # Clean containers and images
npm run clean:all     # Clean everything including volumes
```

### 💰 Wallet Commands
```bash
npm run wallet:info     # Get wallet information
npm run wallet:balance  # Get wallet balance
npm run wallet:address  # Generate new address
npm run wallet:addresses # List all addresses
```

### ⛏️ Mining Commands
```bash
npm run miner:start    # Start CPU mining
```

### 🌐 Network Commands
```bash
npm run network:peers       # Show connected peers
npm run network:connections # Show connection count
npm run rpc:help           # Show RPC commands help
```

### 💾 Backup/Restore Commands
```bash
npm run backup        # Backup wallet data
npm run backup:data   # Backup data directory
# npm run restore:data -- backup-file.tar.gz
```

### 🖥️ VNC Access
```bash
npm run vnc:info      # Show VNC connection information
```

## 🔌 Network Access

### Ports

| Port | Service | Description |
|------|---------|-------------|
| 9332 | RPC | ECOin RPC interface |
| 9333 | P2P | ECOin P2P network |
| 5900 | VNC | VNC access for daemon |
| 5901 | VNC | VNC access for GUI |

### URLs

- **RPC Endpoint**: `http://localhost:9332`
- **VNC Daemon**: `localhost:5900` (password: `ecoinvnc`)
- **VNC GUI**: `localhost:5901` (password: `ecoinvnc`)

## 💾 Persistent Volumes

All data is stored in the `volumes/` directory:

- `volumes/ecoin-data/` - ECOin daemon blockchain and wallet data
- `volumes/ecoin-gui-data/` - ECOin GUI wallet data
- `volumes/logs/` - Application logs
- `volumes/gui-logs/` - GUI application logs

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and modify as needed:

```bash
# ECOin Configuration
ECOIN_RPC_USER=ecoinuser
ECOIN_RPC_PASSWORD=ecoinpass123
ECOIN_RPC_PORT=9332
ECOIN_P2P_PORT=9333

# VNC Configuration
VNC_PASSWORD=ecoinvnc

# Host Ports
HOST_RPC_PORT=9332
HOST_P2P_PORT=9333
HOST_VNC_PORT=5900
```

### ECOin Configuration

The ECOin configuration file is automatically created at:
- Daemon: `volumes/ecoin-data/ecoin.conf`
- GUI: `volumes/ecoin-gui-data/ecoin.conf`

## 🐳 Docker Services

### ecoin-wallet (Daemon)
- Runs ECOin daemon (`ecoind`)
- Exposes RPC and P2P ports
- Persistent data storage
- Health checks enabled

### ecoin-gui (Optional)
- Runs ECOin Qt wallet (`ecoin-qt`)
- VNC access for GUI
- Separate data directory
- Window manager included

## 🔒 Security

- Containers run as non-root user (UID 1000)
- RPC access restricted to private networks
- VNC access password protected
- Firewall-friendly port configuration

## 📊 Monitoring & Health Checks

The daemon container includes health checks:

```bash
# Check daemon status
npm run health

# Monitor logs in real-time
npm run logs

# Check container status
npm run status
```

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Change ports in .env file
   HOST_RPC_PORT=9342
   HOST_P2P_PORT=9343
   ```

2. **Permission issues**:
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 volumes/
   ```

3. **Build failures**:
   ```bash
   # Clean and rebuild
   npm run clean:all
   npm run build
   ```

4. **VNC connection issues**:
   ```bash
   # Check VNC info
   npm run vnc:info
   
   # Connect with VNC viewer to:
   # localhost:5900 (daemon)
   # localhost:5901 (GUI)
   ```

### Debugging

```bash
# Access container shell
npm run shell

# Check ECOin logs
npm run logs:daemon

# Check daemon status
docker-compose exec ecoin-wallet /home/ecoin/ecoind getinfo
```

## 🔄 Updates

To update ECOin to the latest version:

```bash
npm run update
```

This will:
1. Pull latest source code
2. Rebuild Docker image
3. Restart containers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under GPL-3.0 - see the original ECOin project for license details.

## 🔗 Links

- **ECOin Official**: https://ecoin.03c8.net
- **ECOin GitHub**: https://github.com/epsylon/ecoin
- **Docker Hub**: (Add your Docker Hub link here)

## 📞 Support

- Create an issue on GitHub
- Check ECOin documentation
- Review Docker logs: `npm run logs`

---

**Happy Mining! ⛏️💰**