# Linear Plugin

Manage Linear issues and projects from Claude Code - search, create, update issues, track sprints, and manage projects.

## Installation

If installing from the marketplace:

```bash
/plugins install linear
```

## Configuration

The plugin stores configuration in your home directory, separate from the plugin files:

```bash
mkdir -p ~/.config/linear-plugin
echo "LINEAR_API_KEY=lin_api_..." > ~/.config/linear-plugin/.env
```

### Getting an API Key

1. Go to [Linear](https://linear.app)
2. Navigate to **Settings > Account > Security & Access**
3. Under "Personal API keys", click **Create key**
4. Copy the key (starts with `lin_api_`)

### API Key Permissions

By default, personal API keys have full access to your workspace. You can optionally scope them to:
- Specific teams
- Read-only, Write, or Admin access
- Limited to creating issues or comments only

## Features

- **Issues** - List, search, create, update, archive, assign
- **Projects** - List projects, create status updates
- **Teams** - List teams with workflow states
- **Comments** - Create and list comments on issues
- **Users** - List team members, get current user
- **Cycles** - List and manage sprints
- **Labels** - List available labels

## Security

- API key stored in `~/.config/linear-plugin/`, not in plugin directory
- Server binds to localhost only (127.0.0.1)
- Error messages are sanitized to prevent information leakage
- Input validation prevents injection attacks

## Usage

Once configured, Claude will automatically start the server when you ask about Linear. Example prompts:

- "Show me my Linear issues"
- "Search for authentication bugs in Linear"
- "Create a new issue for the login bug"
- "Move ENG-123 to In Progress"
- "Assign ENG-456 to me"

## Priority Levels

| Value | Label |
|-------|-------|
| 0 | No priority |
| 1 | Urgent |
| 2 | High |
| 3 | Medium |
| 4 | Low |

## Troubleshooting

**Server won't start**: Check that `~/.config/linear-plugin/.env` exists and contains a valid `LINEAR_API_KEY`.

**Authentication errors**: Verify your key starts with `lin_api_` and hasn't been revoked.

**Permission errors**: Check your API key has the required permissions for the operation.
