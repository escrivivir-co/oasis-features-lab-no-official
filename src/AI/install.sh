#!/bin/bash

printf "================================\n"
printf "|| OASIS AI 42 Installer v0.2 ||\n"
printf "===============================\n"

MODEL_DIR="./models"
MODEL_FILE="oasis-42-1-chat.Q4_K_M.gguf"
MODEL_TAR="$MODEL_FILE.tar.gz"
MODEL_URL="https://solarnethub.com/code/models/$MODEL_TAR"

if [ ! -f "$MODEL_DIR/$MODEL_FILE" ]; then
    echo ""
    echo "downloading AI model [size: 3,8 GiB (4.081.004.224 bytes)] ..."
    curl -L -o "$MODEL_DIR/$MODEL_TAR" "$MODEL_URL"
    echo ""
    echo "extracting package: $MODEL_TAR..."
    echo ""
    tar -xzf "$MODEL_DIR/$MODEL_TAR" -C "$MODEL_DIR"
    rm "$MODEL_DIR/$MODEL_TAR"
fi

printf "==========================\n"
printf "\nOASIS AI 42 has been correctly deployed! ;)\n\n"

