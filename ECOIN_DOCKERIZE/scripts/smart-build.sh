#!/bin/bash
# Smart ECOin Docker build script with local binary detection

echo "=== ECOin Smart Build System ==="

# Check for local binary directories
FOUND_LOCAL_BINS=false
LOCAL_DIRS=""

for dir in bins_x86_64 bins_amd64 bins_x64 bins_aarch64 bins_arm64; do
    if [ -d "$dir" ] && ([ -f "$dir/ecoind" ] || [ -f "$dir/ecoin-qt" ]); then
        echo "Found local binaries in: $dir"
        LOCAL_DIRS="$LOCAL_DIRS $dir"
        FOUND_LOCAL_BINS=true
    fi
done

# Determine build strategy
if [ "$FOUND_LOCAL_BINS" = "true" ]; then
    echo "Local binaries detected - will prioritize local mode"
    export ECOIN_BUILD_MODE="${ECOIN_BUILD_MODE:-auto}"
    
    # Create temporary Dockerfile with local binary copy commands
    echo "Creating optimized Dockerfile with local binaries..."
    
    # Find the line where to insert binary copy commands (after WORKDIR)
    WORKDIR_LINE=$(grep -n "WORKDIR.*ECOIN_HOME" Dockerfile | cut -d: -f1)
    COPY_SCRIPTS_LINE=$(grep -n "COPY.*scripts.*copy-local-bins.sh" Dockerfile | cut -d: -f1)
    
    if [ -n "$COPY_SCRIPTS_LINE" ]; then
        # Build new Dockerfile without the deprecated copy-local-bins.sh references
        head -n $((COPY_SCRIPTS_LINE - 1)) Dockerfile > Dockerfile.smart
        
        # Add direct binary copy commands
        echo "" >> Dockerfile.smart
        echo "#!/bin/bash
# Smart ECOin Docker build script with multi-architecture binary detection

echo "=== ECOin Smart Build System ==="

# Ensure bins directories exist for Docker COPY (even if empty)
for arch_dir in bins_x86_64 bins_aarch64; do
    if [ ! -d "$arch_dir" ]; then
        mkdir -p "$arch_dir"
        touch "$arch_dir/.empty"
        echo "Created empty $arch_dir directory for Docker"
    fi
done

# Check for local binary directories with priority
FOUND_LOCAL_BINS=false
DETECTED_ARCH=""

# Priority order: x86_64 (native) -> aarch64 -> fallback to source
for arch_dir in bins_x86_64 bins_aarch64; do
    if [ -f "$arch_dir/ecoind" ] && [ -f "$arch_dir/ecoin-qt" ]; then
        echo "✓ Found local binaries in $arch_dir/"
        FOUND_LOCAL_BINS=true
        DETECTED_ARCH=$(echo "$arch_dir" | sed 's/bins_//')
        
        # Copy to standard location that Dockerfile expects
        if [ "$arch_dir" != "bins_x86_64" ]; then
            echo "Copying $arch_dir binaries to bins_x86_64 for Docker build..."
            cp "$arch_dir/ecoind" bins_x86_64/
            cp "$arch_dir/ecoin-qt" bins_x86_64/
        fi
        break
    fi
done

if [ "$FOUND_LOCAL_BINS" = "true" ]; then
    # Set build mode to auto for smart detection
    export ECOIN_BUILD_MODE="auto"
    echo "Set ECOIN_BUILD_MODE=auto for smart detection - ${DETECTED_ARCH} architecture"
else
    echo "No local binaries found - using standard build"
    export ECOIN_BUILD_MODE="${ECOIN_BUILD_MODE:-source}"
fi

echo ""
echo "🔧 Build Configuration:"
echo "  Architecture: ${DETECTED_ARCH:-source compilation}"
echo "  Build Mode: $ECOIN_BUILD_MODE"
echo ""

echo "Building with ECOIN_BUILD_MODE=$ECOIN_BUILD_MODE"
docker-compose build

echo ""
echo "=== Build complete ==="
if [ "$FOUND_LOCAL_BINS" = "true" ]; then
    echo "Smart build completed using local $DETECTED_ARCH binaries for fast deployment"
else
    echo "Standard build completed - use 'npm run extract' to cache binaries for future fast builds"
fi
echo ""
echo "Next steps:"
echo "  npm run start:daemon  - Start ECOin wallet daemon"
echo "  npm run start:gui     - Start ECOin GUI"
echo "  npm run wallet:info   - Check wallet status"" >> Dockerfile.smart
        for dir in $LOCAL_DIRS; do
            echo "COPY --chown=\${ECOIN_USER}:\${ECOIN_USER} $dir/ \${ECOIN_HOME}/$dir/" >> Dockerfile.smart
        done
        echo "" >> Dockerfile.smart
        
        # Skip the copy-local-bins.sh related lines and continue from smart detection
        SMART_DETECTION_LINE=$(grep -n "Download and setup ECOin with smart detection" Dockerfile | cut -d: -f1)
        tail -n +$SMART_DETECTION_LINE Dockerfile >> Dockerfile.smart
    else
        # Fallback to original method if pattern not found
        cp Dockerfile Dockerfile.smart
    fi
    
    echo "Smart Dockerfile created, size: $(wc -l Dockerfile.smart)"
    
    echo "Building with local binaries from: $LOCAL_DIRS"
    
    # Backup original Dockerfile and use smart one
    cp Dockerfile Dockerfile.backup
    mv Dockerfile.smart Dockerfile
    docker-compose build
    
    # Restore original Dockerfile
    mv Dockerfile.backup Dockerfile
    
else
    echo "No local binaries found - using standard build"
    export ECOIN_BUILD_MODE="${ECOIN_BUILD_MODE:-source}"
    docker-compose build
fi

echo "=== Build complete ==="
echo "To start the wallet: npm run wallet:start"
echo "To check status: npm run wallet:status"