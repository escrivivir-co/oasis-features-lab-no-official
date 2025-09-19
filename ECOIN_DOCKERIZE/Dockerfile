# ECOin Wallet Dockerized - Configurable Build Version
# Supports both source compilation and binary installation
FROM debian:bookworm-slim as base

LABEL maintainer="ECOin Dockerized"
LABEL description="ECOin P2P Crypto-Currency Wallet and Daemon"
LABEL version="1.0.0"

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV ECOIN_USER=ecoin
ENV ECOIN_HOME=/home/ecoin
ENV ECOIN_DATA=/home/ecoin/.ecoin

# Build mode: "source", "binary", or "auto"
ARG ECOIN_BUILD_MODE=auto
ENV ECOIN_BUILD_MODE=${ECOIN_BUILD_MODE}

# Detect architecture
ARG TARGETARCH
ENV TARGET_ARCH=${TARGETARCH}
RUN echo "=== Architecture Detection ===" && \
    echo "TARGETARCH: ${TARGETARCH}" && \
    echo "BUILD_MODE: ${ECOIN_BUILD_MODE}" && \
    uname -m

# Install base dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    ca-certificates \
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install runtime dependencies always (needed for both binary and source modes)
RUN apt-get update && apt-get install -y \
        libssl3 \
        libdb5.3++ \
        libleveldb1d \
        libminiupnpc17 \
        libqrencode4 \
        libboost-system1.74.0 \
        libboost-filesystem1.74.0 \
        libboost-thread1.74.0 \
        libboost-chrono1.74.0 \
        libboost-program-options1.74.0 \
        && rm -rf /var/lib/apt/lists/*

# Install development dependencies only for source compilation
RUN if [ "$ECOIN_BUILD_MODE" = "source" ]; then \
        apt-get update && apt-get install -y \
            build-essential \
            git \
            unzip \
            autoconf \
            automake \
            libtool \
            pkg-config \
            libssl-dev \
            libdb5.3-dev \
            libdb5.3++-dev \
            libleveldb-dev \
            miniupnpc \
            libminiupnpc-dev \
            libqrencode-dev \
            qt5-qmake \
            qtbase5-dev \
            qttools5-dev \
            qttools5-dev-tools \
            libboost-all-dev \
            && rm -rf /var/lib/apt/lists/*; \
    fi

# Create ecoin user
RUN useradd -m -s /bin/bash ${ECOIN_USER} && \
    mkdir -p ${ECOIN_DATA} && \
    chown -R ${ECOIN_USER}:${ECOIN_USER} ${ECOIN_HOME}

# Switch to ecoin user
USER ${ECOIN_USER}
WORKDIR ${ECOIN_HOME}

# Copy entrypoint script
COPY --chown=${ECOIN_USER}:${ECOIN_USER} scripts/entrypoint.sh ${ECOIN_HOME}/

# Copy potential local binary directories (might be empty if no local binaries)
COPY --chown=${ECOIN_USER}:${ECOIN_USER} bins_x86_64/ ${ECOIN_HOME}/bins_x86_64/
COPY --chown=${ECOIN_USER}:${ECOIN_USER} bins_aarch64/ ${ECOIN_HOME}/bins_aarch64/

# Download and setup ECOin with smart detection
RUN echo "=== ECOin Setup with Smart Detection ===" && \
    BUILD_MODE_FINAL="$ECOIN_BUILD_MODE" && \
    \
    # Check for local binaries from multiple architectures
    ARCH=$(uname -m) && \
    echo "Detected architecture: $ARCH" && \
    \
    # Try x86_64 first (native), then architecture-specific directories
    LOCAL_BINS_FOUND=false && \
    for bins_dir in "bins_x86_64" "bins_aarch64"; do \
        if [ -d "$bins_dir" ] && [ -f "$bins_dir/ecoind" ] && [ -f "$bins_dir/ecoin-qt" ]; then \
            echo "Found local binaries in $bins_dir/, copying to working directory..." && \
            cp "$bins_dir/ecoind" ./ && chmod +x ./ecoind && \
            cp "$bins_dir/ecoin-qt" ./ && chmod +x ./ecoin-qt && \
            LOCAL_BINS_FOUND=true && \
            break; \
        fi; \
    done && \
    \
    # Auto-detection logic
    if [ "$ECOIN_BUILD_MODE" = "auto" ]; then \
        if [ "$LOCAL_BINS_FOUND" = "true" ]; then \
            echo "Found complete local binaries, using local mode" && \
            BUILD_MODE_FINAL="local"; \
        elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
            echo "ARM64 detected, trying remote binaries" && \
            BUILD_MODE_FINAL="binary"; \
        else \
            echo "No complete local binaries found, compiling from source" && \
            BUILD_MODE_FINAL="source"; \
        fi; \
    fi && \
    \
    echo "Final build mode: $BUILD_MODE_FINAL" && \
    \
    # Execute based on final mode
    if [ "$BUILD_MODE_FINAL" = "local" ]; then \
        echo "=== Using local precompiled binaries ===" && \
        ls -la ./ecoind ./ecoin-qt 2>/dev/null || echo "Some binaries missing"; \
    elif [ "$BUILD_MODE_FINAL" = "binary" ]; then \
        echo "=== Downloading remote precompiled binaries ===" && \
        if [ "$(uname -m)" = "aarch64" ]; then \
            wget -O ecoind https://ecoin.03c8.net/packages/arm64/ecoind && \
            wget -O ecoin-qt https://ecoin.03c8.net/packages/arm64/ecoin-qt && \
            echo "d6dd3b8a82c8ea7c484cb2bbe3985f0c  ecoind" | md5sum -c - && \
            echo "dc59ebf19d18ded8d17b536dadfcee8a  ecoin-qt" | md5sum -c - && \
            chmod +x ecoind ecoin-qt; \
        else \
            echo "No remote binaries available for $(uname -m), falling back to source compilation" && \
            BUILD_MODE_FINAL="source"; \
        fi; \
    fi && \
    \
    # Source compilation fallback
    if [ "$BUILD_MODE_FINAL" = "source" ] || [ ! -f "./ecoind" ]; then \
        echo "=== Downloading ECOin source code ===" && \
        (wget -O ecoin.zip https://github.com/epsylon/ecoin/archive/refs/heads/main.zip || \
         wget -O ecoin.zip https://github.com/epsylon/ecoin/archive/refs/heads/master.zip || \
         curl -L -o ecoin.zip https://github.com/epsylon/ecoin/archive/refs/heads/main.zip || \
         curl -L -o ecoin.zip https://github.com/epsylon/ecoin/archive/refs/heads/master.zip) && \
        unzip ecoin.zip && \
        mv ecoin-* ecoin-src && \
        rm ecoin.zip; \
    fi

# Build process based on mode
RUN if [ "$ECOIN_BUILD_MODE" = "source" ]; then \
        echo "=== Building from source ===" && \
        cd ${ECOIN_HOME}/ecoin-src/ecoin && \
        echo "=== ECOin source structure ===" && \
        ls -la && \
        echo "=== src directory ===" && \
        if [ -d "src" ]; then ls -la src/ | head -20; else echo "No src directory"; fi && \
        echo "=== Building ECOin daemon ===" && \
        cd src && \
        make -f makefile.linux USE_UPNP=- USE_IPV6=- && \
        echo "=== Building ECOin Qt wallet ===" && \
        cd .. && \
        qmake USE_UPNP=- USE_IPV6=- -o Makefile ecoin-qt.pro && \
        make && \
        echo "=== Build completed ==="; \
    else \
        echo "=== Using precompiled binaries - no compilation needed ==="; \
    fi

# Create symlinks for easier access
WORKDIR ${ECOIN_HOME}
RUN echo "=== Creating symlinks ===" && \
    if [ "$ECOIN_BUILD_MODE" = "binary" ]; then \
        echo "Using precompiled binaries" && \
        chmod +x ecoind ecoin-qt; \
    else \
        echo "Using compiled binaries from source" && \
        if [ -f "ecoin-src/ecoin/src/ecoind" ]; then \
            ln -s ${ECOIN_HOME}/ecoin-src/ecoin/src/ecoind ./ecoind && \
            echo "Linked ecoind daemon"; \
        fi && \
        if [ -f "ecoin-src/ecoin/ecoin-qt" ]; then \
            ln -s ${ECOIN_HOME}/ecoin-src/ecoin/ecoin-qt ./ecoin-qt && \
            echo "Linked Qt wallet"; \
        fi; \
    fi

# Show final build results
RUN echo "=== Build Summary ===" && \
    echo "ecoind: $(if [ -x ecoind ]; then echo 'Available'; else echo 'Not available'; fi)" && \
    echo "ecoin-qt: $(if [ -x ecoin-qt ]; then echo 'Available'; else echo 'Not available'; fi)"

# Create data directory
RUN mkdir -p ${ECOIN_DATA}

# Expose ports
EXPOSE 9333 9332 5900

# Copy entrypoint script
COPY --chown=${ECOIN_USER}:${ECOIN_USER} scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
USER root
RUN chmod +x /usr/local/bin/entrypoint.sh
USER ${ECOIN_USER}

# Set volumes
VOLUME ["${ECOIN_DATA}"]

# Default command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["daemon"]