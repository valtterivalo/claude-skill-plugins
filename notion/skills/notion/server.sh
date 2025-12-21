#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CONFIG_DIR="${HOME}/.config/notion-plugin"
ENV_FILE="${CONFIG_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Notion plugin not configured."
    echo ""
    echo "Setup instructions:"
    echo "1. Create config directory: mkdir -p ~/.config/notion-plugin"
    echo "2. Create a Notion integration at: https://www.notion.so/my-integrations"
    echo "3. Copy the Internal Integration Token (starts with 'secret_')"
    echo "4. Create config: echo 'NOTION_API_KEY=secret_...' > ~/.config/notion-plugin/.env"
    echo "5. Share pages/databases with your integration in Notion"
    echo ""
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [[ ! "$NOTION_API_KEY" =~ ^secret_ ]]; then
    echo "Error: Invalid API key format. Must start with 'secret_'"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

exec bun x tsx src/index.ts
