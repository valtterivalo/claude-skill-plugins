#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

CONFIG_DIR="${HOME}/.config/slack-plugin"
ENV_FILE="${CONFIG_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Slack plugin not configured."
    echo ""
    echo "Setup instructions:"
    echo "1. Create config directory: mkdir -p ~/.config/slack-plugin"
    echo "2. Create a Slack app at https://api.slack.com/apps"
    echo "3. Add required bot scopes (see README)"
    echo "4. Install the app to your workspace"
    echo "5. Copy the Bot User OAuth Token"
    echo "6. Create config: echo 'SLACK_BOT_TOKEN=xoxb-...' > ~/.config/slack-plugin/.env"
    echo ""
    exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [[ ! "$SLACK_BOT_TOKEN" =~ ^xoxb- ]]; then
    echo "Error: Invalid token format. Must be a bot token starting with 'xoxb-'"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    bun install
fi

exec bun x tsx src/index.ts
