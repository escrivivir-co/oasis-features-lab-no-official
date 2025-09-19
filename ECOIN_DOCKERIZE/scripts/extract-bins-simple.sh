#!/bin/bash
# Simplified binary extraction script

echo "=== ECOin Binary Extraction ==="

# Check if we have built containers
IMAGES=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | grep ecoin | head -5)
if [ -z "$IMAGES" ]; then
    echo "❌ No ECOin Docker images found. Please build first with: npm run build"
    exit 1
fi

echo "Available ECOin images:"
echo "$IMAGES"
echo ""

# Use the most recent ecoin-wallet image
IMAGE_NAME=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "ecoin.*wallet" | head -1)
if [ -z "$IMAGE_NAME" ]; then
    IMAGE_NAME=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep ecoin | head -1)
fi

echo "Using image: $IMAGE_NAME"
echo ""

# Create extraction directory
mkdir -p bins_x86_64
echo "Created bins_x86_64 directory"

# Extract binaries
echo "Extracting binaries..."
CONTAINER_ID=$(docker create "$IMAGE_NAME")
echo "Created temporary container: $CONTAINER_ID"

# Copy the actual compiled binaries
if docker cp "$CONTAINER_ID:/home/ecoin/ecoin-src/ecoin/src/ecoind" bins_x86_64/ 2>/dev/null; then
    echo "✓ Extracted ecoind ($(du -h bins_x86_64/ecoind | cut -f1))"
else
    echo "❌ Failed to extract ecoind"
fi

if docker cp "$CONTAINER_ID:/home/ecoin/ecoin-src/ecoin/ecoin-qt" bins_x86_64/ 2>/dev/null; then
    echo "✓ Extracted ecoin-qt ($(du -h bins_x86_64/ecoin-qt | cut -f1))"
else
    echo "❌ Failed to extract ecoin-qt"
fi

# Cleanup
docker rm "$CONTAINER_ID" >/dev/null
echo "Cleaned up temporary container"
echo ""

# Verify extraction
if [ -f "bins_x86_64/ecoind" ] && [ -f "bins_x86_64/ecoin-qt" ]; then
    echo "🎉 Binary extraction successful!"
    echo ""
    echo "Extracted binaries:"
    ls -lh bins_x86_64/
    echo ""
    echo "Binary info:"
    file bins_x86_64/ecoind | head -1
    file bins_x86_64/ecoin-qt | head -1
    echo ""
    echo "Next steps:"
    echo "  npm run build:smart   - Use these binaries for fast builds"
    echo "  npm run clean:bins    - Remove extracted binaries"
else
    echo "❌ Binary extraction failed"
    echo "Make sure you have built ECOin containers first with: npm run build"
    exit 1
fi