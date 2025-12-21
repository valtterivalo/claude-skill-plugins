#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CONFIG_DIR="${HOME}/.config/neon-plugin"
ENV_FILE="${CONFIG_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Neon plugin not configured."
    echo ""
    echo "Setup instructions:"
    echo "1. Create config directory: mkdir -p ~/.config/neon-plugin"
    echo "2. Get Organization API key from: https://console.neon.tech"
    echo "   (Organization Settings > API keys > Create new)"
    echo "3. Create config: echo 'NEON_API_KEY=your_key' > ~/.config/neon-plugin/.env"
    echo ""
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [[ ! "$NEON_API_KEY" =~ ^napi_ ]]; then
    echo "Error: Invalid API key format. Must start with 'napi_'"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

exec bun x tsx src/index.ts
