#!/bin/bash
# ECOin Docker Workflow Helper - Shows current status and next steps

echo "=== ECOin Docker Status ==="
echo ""

# Check for binary directories
echo "� Local Binary Cache:"
for arch_dir in bins_x86_64 bins_aarch64; do
    if [ -d "$arch_dir" ] && [ -f "$arch_dir/ecoind" ] && [ -f "$arch_dir/ecoin-qt" ]; then
        ecoind_size=$(du -h "$arch_dir/ecoind" 2>/dev/null | cut -f1 || echo "?")
        ecoinqt_size=$(du -h "$arch_dir/ecoin-qt" 2>/dev/null | cut -f1 || echo "?")
        echo "  ✓ $arch_dir/ - ecoind ($ecoind_size), ecoin-qt ($ecoinqt_size)"
    elif [ -d "$arch_dir" ] && [ "$(ls -A $arch_dir 2>/dev/null | grep -v '^\.empty$' | wc -l)" -gt 0 ]; then
        echo "  ⚠ $arch_dir/ - incomplete ($(ls -A $arch_dir 2>/dev/null | grep -v '^\.empty$' | wc -c) files)"
    else
        echo "  ✗ $arch_dir/ - not available"
    fi
done
echo ""

# Check Docker images
echo "🐳 Docker Images:"
ecoin_image=$(docker images --filter "reference=ecoin_dockerize*" --format "{{.Repository}}:{{.Tag}}" | head -1)
if [ -n "$ecoin_image" ]; then
    image_size=$(docker images --filter "reference=ecoin_dockerize*" --format "{{.Size}}" | head -1)
    echo "  ✓ $ecoin_image ($image_size)"
else
    echo "  ✗ No ECOin images built"
fi
echo ""

# Check running containers
echo "📡 Running Containers:"
daemon_container=$(docker ps --filter "name=ecoin.*daemon" --format "{{.Names}}" | head -1)
gui_container=$(docker ps --filter "name=ecoin.*gui" --format "{{.Names}}" | head -1)

if [ -n "$daemon_container" ]; then
    status=$(docker ps --filter "name=$daemon_container" --format "{{.Status}}")
    echo "  ✓ $daemon_container - $status"
else
    echo "  ✗ ECOin daemon not running"
fi

if [ -n "$gui_container" ]; then
    status=$(docker ps --filter "name=$gui_container" --format "{{.Status}}")
    echo "  ✓ $gui_container - $status"
else
    echo "  ✗ ECOin GUI not running"
fi
echo ""

# Intelligent recommendations
echo "🎯 Recommended Next Actions:"

# If no local binaries and no image
any_bins=$(find bins_* -name "ecoind" 2>/dev/null | head -1)
if [ -z "$any_bins" ] && [ -z "$ecoin_image" ]; then
    echo "  1. npm run build:smart     - Build from source (first time)"
    echo "  2. npm run extract         - Cache binaries for future builds"
    echo "  3. npm run start:daemon    - Start ECOin daemon"
    
# If have local binaries but no image
elif [ -n "$any_bins" ] && [ -z "$ecoin_image" ]; then
    echo "  1. npm run build:smart     - Fast build using local binaries"
    echo "  2. npm run start:daemon    - Start ECOin daemon"
    
# If have image but no containers running
elif [ -n "$ecoin_image" ] && [ -z "$daemon_container" ] && [ -z "$gui_container" ]; then
    echo "  1. npm run start:daemon    - Start ECOin wallet daemon"
    echo "  2. npm run start:gui       - Start ECOin GUI wallet"
    echo "  3. npm run wallet:info     - Check wallet status"
    
# If daemon running but want GUI
elif [ -n "$daemon_container" ] && [ -z "$gui_container" ]; then
    echo "  1. npm run start:gui       - Start ECOin GUI wallet"
    echo "  2. npm run wallet:info     - Check wallet status"
    echo "  3. npm run logs:daemon     - View daemon logs"
    
# If everything running
elif [ -n "$daemon_container" ] && [ -n "$gui_container" ]; then
    echo "  ✅ All services running!"
    echo "  1. npm run wallet:info     - Check wallet status"
    echo "  2. npm run logs            - View all logs"
    echo "  3. Open browser: http://localhost:5900 (GUI access)"
else
    echo "  1. npm run build:smart     - Rebuild container"
    echo "  2. npm run start:daemon    - Start daemon"
fi

echo ""
echo "📋 Available Commands:"
echo "  npm run build:smart        - Smart build (auto-detects local binaries)"
echo "  npm run download:arm64     - Download ARM64 binaries for testing"
echo "  npm run extract            - Extract binaries from successful build"
echo "  npm run start:daemon       - Start ECOin daemon"
echo "  npm run start:gui          - Start ECOin GUI"
echo "  npm run wallet:info        - Show wallet information"
echo "  npm run logs               - View container logs"
echo "  npm run stop               - Stop all containers"
echo "  npm run clean              - Clean containers and images"
echo ""
echo "💡 Multi-Architecture Support:"
echo "  - bins_x86_64/: Native x86_64 binaries (priority)"
echo "  - bins_aarch64/: ARM64 binaries for testing"
echo "  - Smart build automatically selects best available binaries"