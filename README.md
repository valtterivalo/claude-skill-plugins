# Skill Plugins

A collection of skill plugins for Claude Code that provide lightweight, context-efficient integrations with external services.

## Why Skill Plugins?

These plugins use HTTP server patterns instead of MCP for lighter-weight integrations. Each plugin runs as a local Express server that Claude interacts with via curl and JSON payloads.

## Available Plugins

| Plugin | Port | Description | Config |
|--------|------|-------------|--------|
| [Neon](./neon/) | 9224 | PostgreSQL database management, SQL queries, branches | `NEON_API_KEY` |
| [Linear](./linear/) | 9226 | Issues, projects, teams, cycles, labels | `LINEAR_API_KEY` |
| [Supabase](./supabase/) | 9227 | CRUD operations, RPC functions, table introspection | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| [Slack](./slack/) | 9228 | Channels, messages, users, reactions, files | `SLACK_BOT_TOKEN` |

## Installation

Add the marketplace:

```bash
/plugins add https://github.com/valtterivalo/claude-skill-plugins
```

Install individual plugins:

```bash
/plugins install neon
/plugins install linear
/plugins install supabase
/plugins install slack
```

## Configuration

Each plugin stores its configuration in `~/.config/<plugin>-plugin/.env`:

```bash
# Neon
mkdir -p ~/.config/neon-plugin
echo "NEON_API_KEY=napi_..." > ~/.config/neon-plugin/.env

# Linear
mkdir -p ~/.config/linear-plugin
echo "LINEAR_API_KEY=lin_api_..." > ~/.config/linear-plugin/.env

# Supabase
mkdir -p ~/.config/supabase-plugin
cat > ~/.config/supabase-plugin/.env << EOF
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
EOF

# Slack
mkdir -p ~/.config/slack-plugin
echo "SLACK_BOT_TOKEN=xoxb-..." > ~/.config/slack-plugin/.env
```

## Architecture

```
┌─────────────────┐      curl + JSON      ┌─────────────────┐
│   Claude Code   │ ──────────────────────│  Plugin Server  │
│                 │      localhost:92XX   │   (Express)     │
└─────────────────┘                       └────────┬────────┘
                                                   │
                                                   │ SDK
                                                   ▼
                                          ┌─────────────────┐
                                          │  External API   │
                                          │ (Neon, Slack..) │
                                          └─────────────────┘
```

All plugins follow the same request pattern:

```json
POST http://localhost:92XX/action
{
  "category": "...",
  "action": "...",
  "params": {...}
}
```

Response format:

```json
{"success": true, "data": {...}}
{"success": false, "error": "..."}
```

## Plugin Structure

```
plugin-name/
├── README.md                 # Installation and configuration
└── skills/
    └── plugin-name/
        ├── SKILL.md          # API reference for Claude
        ├── server.sh         # Startup script
        ├── package.json      # Dependencies
        ├── tsconfig.json     # TypeScript config
        └── src/
            ├── index.ts      # HTTP server
            ├── *-api.ts      # SDK wrapper
            ├── types.ts      # Type definitions
            ├── validation.ts # Zod schemas
            └── errors.ts     # Error sanitization
```

## Security

- **Credential isolation**: API keys stored in `~/.config/`, not in plugin directories
- **Localhost binding**: Servers bind to `127.0.0.1` only - not exposed to network
- **Error sanitization**: Sensitive info (tokens, URLs) redacted from error messages
- **Input validation**: All parameters validated with Zod schemas
- **SQL safety**: Query parameters use parameterized queries

## Ephemeral Design

These plugins are designed for per-session use:

- No persistent state between sessions
- No long-running background processes
- Servers start on demand and shutdown cleanly
- No caching or session storage

## Usage Examples

Once configured, just ask Claude naturally:

- "Show me my Neon projects"
- "Create a Linear issue for the login bug"
- "Query users from Supabase where status is active"
- "Send a Slack message to #general"

Claude will automatically start the appropriate server and make the API calls.

## License

MIT
