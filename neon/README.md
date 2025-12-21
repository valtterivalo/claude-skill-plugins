# Neon Database Plugin

Manage Neon PostgreSQL databases from Claude Code - list projects, create branches, run SQL queries, and inspect table schemas.

## Installation

If installing from the marketplace:

```bash
/plugins install neon
```

## Configuration

The plugin stores configuration in your home directory, separate from the plugin files:

```bash
mkdir -p ~/.config/neon-plugin
echo "NEON_API_KEY=your_key_here" > ~/.config/neon-plugin/.env
```

### Getting an API Key

1. Go to [Neon Console](https://console.neon.tech)
2. Navigate to **Organization Settings > API keys**
3. Click **Create new API key**
4. Copy the key (it starts with `napi_`)

**Important**: Use an Organization API key, not a Personal API key. Personal keys require an org_id parameter which this plugin doesn't support.

### Optional Configuration

```bash
# Enable full connection URI in responses (includes password)
echo "ALLOW_CONNECTION_URI=true" >> ~/.config/neon-plugin/.env
```

By default, connection details are returned without the password for security. Enable this if you need the full URI.

## Features

- **Project Management**: List, get, create, delete projects
- **Branch Management**: Create dev branches, manage branch lifecycle
- **SQL Execution**: Run queries, parameterized queries, explain plans
- **Schema Inspection**: List tables, describe columns

## Security

- API keys stored in `~/.config/neon-plugin/`, not in plugin directory
- Server binds to localhost only (127.0.0.1)
- Error messages are sanitized to prevent information leakage
- Input validation prevents injection attacks
- Connection URIs with passwords disabled by default

## Usage

Once configured, Claude will automatically start the server when you ask about Neon databases. Example prompts:

- "List my Neon projects"
- "Show me the tables in my database"
- "Run a query to find all users"
- "Create a new dev branch for testing"

## Troubleshooting

**Server won't start**: Check that `~/.config/neon-plugin/.env` exists and contains a valid `NEON_API_KEY`.

**Authentication errors**: Make sure you're using an Organization API key (starts with `napi_`), not a Personal API key.

**Connection refused**: The server only binds to 127.0.0.1. Ensure you're accessing from localhost.
