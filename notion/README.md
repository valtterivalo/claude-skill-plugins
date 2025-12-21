# Notion Plugin

Access your Notion workspace from Claude Code - search pages, query databases, read and create content.

## Installation

If installing from the marketplace:

```bash
/plugins install notion
```

## Configuration

The plugin stores configuration in your home directory, separate from the plugin files:

```bash
mkdir -p ~/.config/notion-plugin
echo "NOTION_API_KEY=secret_..." > ~/.config/notion-plugin/.env
```

### Getting an API Key

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it (e.g., "Claude Code")
4. Select your workspace
5. Copy the **Internal Integration Token** (starts with `secret_`)

### Sharing Content with the Integration

Your integration can only access pages/databases explicitly shared with it:

1. Open a page or database in Notion
2. Click the **...** menu (top right)
3. Select **Add connections**
4. Choose your integration

Repeat for each page/database you want accessible.

## Features

- **Search** - Find pages and databases in your workspace
- **Pages** - Read, create, update, and archive pages
- **Databases** - Query with filters, create entries
- **Blocks** - Read and append content
- **Comments** - Read and create comments

## Security

- API key stored in `~/.config/notion-plugin/`, not in plugin directory
- Server binds to localhost only (127.0.0.1)
- Error messages are sanitized to prevent information leakage
- Input validation prevents injection attacks

## Usage

Once configured, Claude will automatically start the server when you ask about Notion. Example prompts:

- "Search my Notion for meeting notes"
- "Show me the contents of my Projects database"
- "Create a new page with today's standup notes"
- "Add a comment to my roadmap page"

## Troubleshooting

**Server won't start**: Check that `~/.config/notion-plugin/.env` exists and contains a valid `NOTION_API_KEY`.

**Resource not found**: Make sure the page/database is shared with your integration.

**Authentication errors**: Verify your token starts with `secret_` and is from an active integration.
