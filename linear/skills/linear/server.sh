#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CONFIG_DIR="${HOME}/.config/linear-plugin"
ENV_FILE="${CONFIG_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Linear plugin not configured."
    echo ""
    echo "Setup instructions:"
    echo "1. Create config directory: mkdir -p ~/.config/linear-plugin"
    echo "2. Get your API key from Linear:"
    echo "   Settings > Account > Security & Access > Personal API keys"
    echo "3. Create config: echo 'LINEAR_API_KEY=lin_api_...' > ~/.config/linear-plugin/.env"
    echo ""
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [[ ! "$LINEAR_API_KEY" =~ ^lin_api_ ]]; then
    echo "Error: Invalid API key format. Must start with 'lin_api_'"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

exec bun x tsx src/index.ts
