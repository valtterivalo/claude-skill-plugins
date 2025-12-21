---
name: notion
description: Access Notion workspace - search pages, query databases, read and create content. Use when the user asks about Notion pages, databases, or wants to manage their Notion workspace.
---

# Notion Skill

Interact with Notion workspace through a local HTTP server.

## Before Using This Skill

### 1. Check if Server is Running

```bash
curl -s http://localhost:9225/health 2>/dev/null || echo "not running"
```

### 2. Start Server if Not Running

```bash
cd ~/.claude/plugins/skill-plugins/notion/skills/notion && ./server.sh &
```

Wait a moment, then verify:

```bash
curl -s http://localhost:9225/health
```

### 3. Handle Missing Configuration

If the server exits with setup instructions, guide the user:

1. Create config directory:
   ```bash
   mkdir -p ~/.config/notion-plugin
   ```

2. Create a Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Name it (e.g., "Claude Code")
   - Copy the "Internal Integration Token" (starts with `secret_`)

3. Create the config file:
   ```bash
   echo "NOTION_API_KEY=secret_..." > ~/.config/notion-plugin/.env
   ```

4. Share pages/databases with the integration:
   - Open a page in Notion
   - Click "..." menu → "Add connections"
   - Select your integration

5. Restart the server

## API Reference

All requests go to `http://localhost:9225/action` with POST method and JSON body:
```json
{"category": "...", "action": "...", "params": {...}}
```

### Search

Search workspace:
```json
{"category": "search", "action": "query", "params": {"query": "meeting notes"}}
```

Filter by type:
```json
{"category": "search", "action": "query", "params": {"query": "projects", "filter": "database"}}
```

### Pages

Get page content:
```json
{"category": "pages", "action": "get", "params": {"pageId": "PAGE_ID_OR_URL"}}
```

Create page:
```json
{"category": "pages", "action": "create", "params": {"parentId": "PARENT_PAGE_ID", "title": "My Page", "content": "Page content here"}}
```

Update page properties:
```json
{"category": "pages", "action": "update", "params": {"pageId": "PAGE_ID", "properties": {...}}}
```

Archive page:
```json
{"category": "pages", "action": "archive", "params": {"pageId": "PAGE_ID"}}
```

### Databases

Get database schema:
```json
{"category": "databases", "action": "get", "params": {"databaseId": "DATABASE_ID"}}
```

Query database:
```json
{"category": "databases", "action": "query", "params": {"databaseId": "DATABASE_ID"}}
```

Query with filter:
```json
{"category": "databases", "action": "query", "params": {"databaseId": "DATABASE_ID", "filter": {"property": "Status", "select": {"equals": "Done"}}}}
```

Create database entry:
```json
{"category": "databases", "action": "create_entry", "params": {"databaseId": "DATABASE_ID", "properties": {"Name": {"title": [{"text": {"content": "New Item"}}]}}}}
```

### Blocks

Get block children (page content):
```json
{"category": "blocks", "action": "get", "params": {"blockId": "PAGE_OR_BLOCK_ID"}}
```

Append content to page:
```json
{"category": "blocks", "action": "append", "params": {"blockId": "PAGE_ID", "content": "New paragraph to add"}}
```

### Comments

List comments on a page:
```json
{"category": "comments", "action": "list", "params": {"pageId": "PAGE_ID"}}
```

Create comment:
```json
{"category": "comments", "action": "create", "params": {"pageId": "PAGE_ID", "content": "This is a comment"}}
```

## Common Workflows

### Find and Read a Page

1. Search for the page: `{"category": "search", "action": "query", "params": {"query": "page name"}}`
2. Get page content: `{"category": "pages", "action": "get", "params": {"pageId": "..."}}`

### Query a Database

1. Search for database: `{"category": "search", "action": "query", "params": {"query": "db name", "filter": "database"}}`
2. Get schema: `{"category": "databases", "action": "get", "params": {"databaseId": "..."}}`
3. Query entries: `{"category": "databases", "action": "query", "params": {"databaseId": "..."}}`

### Add Content to a Page

1. Get page ID from search or URL
2. Append content: `{"category": "blocks", "action": "append", "params": {"blockId": "PAGE_ID", "content": "..."}}`

## ID Formats

Both page/database IDs and Notion URLs work:
- ID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- URL: `https://www.notion.so/Page-Title-a1b2c3d4e5f67890abcdef1234567890`

## Response Format

Success:
```json
{"success": true, "data": {...}}
```

Error:
```json
{"success": false, "error": "Error message"}
```

## Curl Examples

```bash
# Search for pages
curl -X POST http://localhost:9225/action \
  -H "Content-Type: application/json" \
  -d '{"category": "search", "action": "query", "params": {"query": "meeting"}}'

# Get page content
curl -X POST http://localhost:9225/action \
  -H "Content-Type: application/json" \
  -d '{"category": "pages", "action": "get", "params": {"pageId": "YOUR_PAGE_ID"}}'
```
