# ECOin Wallet Dockerized
# Based on Debian bookworm for compatibility with build requirements
FROM debian:bookworm-slim

LABEL maintainer="ECOin Dockerized"
LABEL description="ECOin P2P Crypto-Currency Wallet and Daemon"
LABEL version="1.0.0"

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV ECOIN_USER=ecoin
ENV ECOIN_HOME=/home/ecoin
ENV ECOIN_DATA=/home/ecoin/.ecoin

# Update package list and install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    libssl3 \
    libdb5.3-dev \
    libdb5.3++-dev \
    libleveldb-dev \
    miniupnpc \
    libminiupnpc-dev \
    libqrencode-dev \
    qt5-qmake \
    qtbase5-dev \
    git \
    wget \
    curl \
    ca-certificates \
    xvfb \
    x11vnc \
    fluxbox \
    autoconf \
    automake \
    libtool \
    pkg-config \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

# Create ecoin user
RUN useradd -m -s /bin/bash ${ECOIN_USER} && \
    mkdir -p ${ECOIN_DATA} && \
    chown -R ${ECOIN_USER}:${ECOIN_USER} ${ECOIN_HOME}

# Switch to ecoin user
USER ${ECOIN_USER}
WORKDIR ${ECOIN_HOME}

# Download ECOin source code using multiple strategies
RUN git config --global core.longpaths true && \
    git config --global core.autocrlf false && \
    echo "Attempting to download ECOin source code..." && \
    (wget -O ecoin.tar.gz https://github.com/epsylon/ecoin/archive/refs/heads/main.tar.gz || \
     wget -O ecoin.tar.gz https://github.com/epsylon/ecoin/archive/refs/heads/master.tar.gz || \
     curl -L -o ecoin.tar.gz https://github.com/epsylon/ecoin/archive/refs/heads/main.tar.gz || \
     curl -L -o ecoin.tar.gz https://github.com/epsylon/ecoin/archive/refs/heads/master.tar.gz) && \
    tar -xzf ecoin.tar.gz && \
    mv ecoin-* ecoin-src && \
    rm ecoin.tar.gz && \
    echo "Source code download completed successfully"

# Check if src directory exists and list contents for debugging
WORKDIR ${ECOIN_HOME}/ecoin-src
RUN ls -la && \
    echo "=== Checking src directory ===" && \
    if [ -d "src" ]; then \
        echo "src directory found, listing contents:"; \
        ls -la src/; \
        echo "=== Checking for cpp files ==="; \
        find src/ -name "*.cpp" | head -10; \
        echo "=== Checking for makefile ==="; \
        find . -name "makefile*" -o -name "Makefile*"; \
    else \
        echo "src directory not found"; \
        echo "Available directories:"; \
        ls -la; \
    fi

# Build ECOin daemon (ecoind) - check for makefile existence first
WORKDIR ${ECOIN_HOME}/ecoin-src/src
RUN if [ -f "makefile.linux" ]; then \
        make -f makefile.linux USE_UPNP=- USE_IPV6=- && strip ecoind; \
    elif [ -f "Makefile" ]; then \
        make USE_UPNP=- USE_IPV6=- ecoind && strip ecoind; \
    else \
        echo "No makefile found, trying alternative build"; \
        cd .. && \
        if [ -f "build.sh" ]; then \
            chmod +x build.sh && ./build.sh; \
        else \
            echo "Manual build required"; \
            cd src && \
            g++ -std=c++11 -O2 -pthread -Wall -Wextra -Wformat -Wformat-security \
                -Wno-unused-parameter -DUSE_LEVELDB -DBOOST_SPIRIT_THREADSAFE \
                -I. -I./leveldb/include -I./leveldb/helpers \
                -Iboost_1_68_0 -I./boost_1_68_0/boost \
                *.cpp leveldb/libleveldb.a \
                -lssl -lcrypto -ldb_cxx-5.3 -ldl -lpthread \
                -o ecoind && strip ecoind; \
        fi; \
    fi

# Build ECOin Qt wallet (ecoin-qt)
WORKDIR ${ECOIN_HOME}/ecoin-src
RUN if [ -f "ecoin-qt.pro" ]; then \
        qmake USE_UPNP=- USE_IPV6=- && make; \
    else \
        echo "ecoin-qt.pro not found, skipping Qt wallet build"; \
        mkdir -p dummy && echo "#!/bin/bash" > ecoin-qt && echo "echo 'Qt wallet not available'" >> ecoin-qt && chmod +x ecoin-qt; \
    fi

# Build CPU miner (optional)
WORKDIR ${ECOIN_HOME}/ecoin-src
RUN if [ -d "miner" ]; then \
        cd miner && \
        if [ -f "build.sh" ]; then \
            chmod +x build.sh && ./build.sh; \
        elif [ -f "configure.ac" ]; then \
            autoreconf -fi && ./configure && make; \
        else \
            echo "Miner build files not found"; \
            echo "#!/bin/bash" > cpuminer && echo "echo 'Miner not available'" >> cpuminer && chmod +x cpuminer; \
        fi; \
    else \
        echo "Miner directory not found"; \
        mkdir -p miner && cd miner && \
        echo "#!/bin/bash" > cpuminer && echo "echo 'Miner not available'" >> cpuminer && chmod +x cpuminer; \
    fi

# Create symlinks for easier access
WORKDIR ${ECOIN_HOME}
RUN if [ -f "${ECOIN_HOME}/ecoin-src/src/ecoind" ]; then \
        ln -s ${ECOIN_HOME}/ecoin-src/src/ecoind ./ecoind; \
    else \
        echo "Warning: ecoind binary not found"; \
        echo "#!/bin/bash" > ecoind && echo "echo 'ecoind not available'" >> ecoind && chmod +x ecoind; \
    fi && \
    if [ -f "${ECOIN_HOME}/ecoin-src/ecoin-qt" ]; then \
        ln -s ${ECOIN_HOME}/ecoin-src/ecoin-qt ./ecoin-qt; \
    else \
        echo "Warning: ecoin-qt binary not found"; \
        echo "#!/bin/bash" > ecoin-qt && echo "echo 'ecoin-qt not available'" >> ecoin-qt && chmod +x ecoin-qt; \
    fi && \
    if [ -f "${ECOIN_HOME}/ecoin-src/miner/cpuminer" ]; then \
        ln -s ${ECOIN_HOME}/ecoin-src/miner/cpuminer ./cpuminer; \
    else \
        echo "Warning: cpuminer binary not found"; \
        echo "#!/bin/bash" > cpuminer && echo "echo 'cpuminer not available'" >> cpuminer && chmod +x cpuminer; \
    fi

# Create data directory
RUN mkdir -p ${ECOIN_DATA}

# Expose ports
# 9333: ECOin P2P network port
# 9332: ECOin RPC port
# 5900: VNC port for GUI access
EXPOSE 9333 9332 5900

# Copy entrypoint script
COPY --chown=${ECOIN_USER}:${ECOIN_USER} scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set volumes
VOLUME ["${ECOIN_DATA}"]

# Default command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["daemon"]