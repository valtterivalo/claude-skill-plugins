#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CONFIG_DIR="${HOME}/.config/supabase-plugin"
ENV_FILE="${CONFIG_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Supabase plugin not configured."
    echo ""
    echo "Setup instructions:"
    echo "1. Create config directory: mkdir -p ~/.config/supabase-plugin"
    echo "2. Get your Supabase project URL and service key from:"
    echo "   Project Dashboard > Settings > API"
    echo "3. Create config file:"
    echo "   cat > ~/.config/supabase-plugin/.env << EOF"
    echo "   SUPABASE_URL=https://xxxxx.supabase.co"
    echo "   SUPABASE_SERVICE_KEY=eyJhbG..."
    echo "   EOF"
    echo ""
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [ -z "$SUPABASE_URL" ]; then
    echo "Error: SUPABASE_URL not found in config"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Error: SUPABASE_SERVICE_KEY not found in config"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

exec bun x tsx src/index.ts
