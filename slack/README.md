# Slack Plugin

Send messages, manage channels, list users, and add reactions in Slack from Claude Code.

## Installation

If installing from the marketplace:

```bash
/plugins install slack
```

## Configuration

The plugin stores configuration in your home directory, separate from the plugin files:

```bash
mkdir -p ~/.config/slack-plugin
echo "SLACK_BOT_TOKEN=xoxp-..." > ~/.config/slack-plugin/.env
```

### Getting a User Token

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Name your app and select your workspace
4. Go to **OAuth & Permissions** in the sidebar
5. Under **Scopes > User Token Scopes**, add the required scopes (see below)
6. Click **Install to Workspace** and authorize
7. Copy the **User OAuth Token** (starts with `xoxp-`)

### Required User Token Scopes

| Scope | Required For |
|-------|--------------|
| `channels:read` | List public channels |
| `channels:join` | Join public channels |
| `channels:manage` | Create/archive channels |
| `groups:read` | List private channels |
| `im:read` | List direct messages |
| `mpim:read` | List group DMs |
| `chat:write` | Post/update/delete messages |
| `reactions:read` | Get reactions |
| `reactions:write` | Add/remove reactions |
| `users:read` | List users, get user info |
| `users:read.email` | Lookup user by email |
| `files:read` | List/get file info |

## Features

- **Channels** - List, create, archive, join channels
- **Messages** - Post, update, delete, get history, reply in threads
- **Users** - List users, get info, lookup by email
- **Reactions** - Add, remove, get reactions on messages
- **Files** - List and get file info

## Security

- Bot token stored in `~/.config/slack-plugin/`, not in plugin directory
- Server binds to localhost only (127.0.0.1)
- Error messages are sanitized to prevent token leakage
- Input validation via Zod schemas

## Usage

Once configured, Claude will automatically start the server when you ask about Slack. Example prompts:

- "List the Slack channels I'm in"
- "Send a message to #general saying hello"
- "Find the Slack user with email user@example.com"
- "Add a thumbsup reaction to the last message in #random"
- "Get the recent messages from #engineering"

## Troubleshooting

**Server won't start**: Check that `~/.config/slack-plugin/.env` exists and contains a valid `SLACK_BOT_TOKEN`.

**Authentication errors**: Verify your token starts with `xoxp-` and hasn't been revoked.

**Permission errors**: Check your bot has the required scopes in the Slack app settings.

**"not_in_channel" errors**: The bot needs to be invited to private channels before it can post there.
