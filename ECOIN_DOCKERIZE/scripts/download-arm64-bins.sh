#!/bin/bash
# Download ARM64 binaries for platform detection testing

echo "=== ECOin ARM64 Binary Downloader ==="
echo ""

# Configuration
ARM64_DIR="bins_aarch64"
ARM64_URLS=(
    "https://ecoin.03c8.net/packages/arm64/ecoind"
    "https://ecoin.03c8.net/packages/arm64/ecoin-qt"
)
ARM64_CHECKSUMS=(
    "d6dd3b8a82c8ea7c484cb2bbe3985f0c  ecoind"
    "dc59ebf19d18ded8d17b536dadfcee8a  ecoin-qt"
)

# Create ARM64 directory
echo "📁 Creating ARM64 binaries directory..."
mkdir -p "$ARM64_DIR"
echo "Created: $ARM64_DIR/"
echo ""

# Download function
download_binary() {
    local url="$1"
    local filename=$(basename "$url")
    local expected_checksum="$2"
    
    echo "📥 Downloading $filename..."
    echo "URL: $url"
    
    # Try wget first, fall back to curl
    download_success=false
    if command -v wget >/dev/null 2>&1; then
        if wget -O "$ARM64_DIR/$filename" "$url" --progress=bar:force 2>&1; then
            download_success=true
        fi
    elif command -v curl >/dev/null 2>&1; then
        if curl -L -o "$ARM64_DIR/$filename" "$url" --progress-bar 2>&1; then
            download_success=true
        fi
    else
        echo "❌ Neither wget nor curl available"
        echo ""
        return 1
    fi
    
    if [ "$download_success" = "true" ]; then
        echo "✓ Downloaded $filename"
        
        # Verify checksum if provided
        if [ -n "$expected_checksum" ]; then
            echo "🔍 Verifying checksum..."
            cd "$ARM64_DIR"
            if echo "$expected_checksum" | md5sum -c - 2>/dev/null; then
                echo "✓ Checksum verified for $filename"
            else
                echo "❌ Checksum failed for $filename"
                echo "Expected: $expected_checksum"
                echo "Actual:   $(md5sum "$filename" 2>/dev/null)"
                echo "Warning: Checksum mismatch, but continuing..."
            fi
            cd ..
        fi
        
        # Set executable permissions
        chmod +x "$ARM64_DIR/$filename"
        echo "✓ Set executable permissions"
        echo ""
        return 0
    else
        echo "❌ Failed to download $filename"
        echo ""
        return 1
    fi
}

# Download all binaries
echo "🚀 Starting ARM64 binary downloads..."
echo ""

success_count=0
total_count=${#ARM64_URLS[@]}

for i in "${!ARM64_URLS[@]}"; do
    url="${ARM64_URLS[$i]}"
    checksum="${ARM64_CHECKSUMS[$i]}"
    
    if download_binary "$url" "$checksum"; then
        ((success_count++))
    fi
done

echo "📊 Download Summary:"
echo "=================="
echo "Downloaded: $success_count/$total_count binaries"
echo ""

# Check if download was successful
if [ "$success_count" -eq "$total_count" ]; then
    echo "✅ ARM64 binary download complete!"
    echo "Files in $ARM64_DIR/:"
    ls -la "$ARM64_DIR/"
    echo ""
    echo "🧪 Testing Scenarios:"
    echo "1. Test ARM64 smart build:"
    echo "   npm run build:smart"
    echo ""
    echo "2. Test platform switching:"
    echo "   mv bins_x86_64 bins_x86_64_backup"
    echo "   npm run build:smart  # Should use ARM64 bins"
    echo "   mv bins_x86_64_backup bins_x86_64"
    echo ""
    echo "3. Test architecture priority:"
    echo "   # Both directories exist - should prefer x86_64"
    echo "   npm run build:smart"
    echo ""
    echo "4. Test fallback to source:"
    echo "   mv bins_x86_64 bins_x86_64_temp"
    echo "   mv bins_aarch64 bins_aarch64_temp"
    echo "   npm run build:smart  # Should compile from source"
    echo ""
else
    echo "❌ ARM64 binary download incomplete"
    echo "Missing files in $ARM64_DIR/"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Check internet connection"
    echo "2. Verify URLs are accessible:"
    for url in "${ARM64_URLS[@]}"; do
        echo "   $url"
    done
    echo "3. Try running with verbose output: bash -x scripts/download-arm64-bins.sh"
    echo ""
    exit 1
fi