---
name: neon
description: Manage Neon PostgreSQL databases - list projects, create branches, run SQL queries, inspect tables. Use when the user asks about Neon databases, wants to run SQL, manage database branches, or needs connection strings.
---

# Neon Database Skill

Interact with Neon PostgreSQL databases through a local HTTP server.

## Before Using This Skill

### 1. Check if Server is Running

```bash
curl -s http://localhost:9224/health 2>/dev/null || echo "not running"
```

### 2. Start Server if Not Running

```bash
cd ~/.claude/plugins/skill-plugins/neon/skills/neon && ./server.sh &
```

Wait a moment, then verify:

```bash
curl -s http://localhost:9224/health
```

### 3. Handle Missing Configuration

If the server exits with setup instructions, guide the user:

1. Create config directory:
   ```bash
   mkdir -p ~/.config/neon-plugin
   ```

2. Get an **Organization API key** from Neon console:
   - Go to Organization Settings > API keys
   - Click "Create new API key"
   - Copy the key (shown only once)

3. Create the config file:
   ```bash
   echo "NEON_API_KEY=your_org_api_key_here" > ~/.config/neon-plugin/.env
   ```

4. Restart the server

Note: Organization API keys don't require org_id. Personal API keys won't work.

## API Reference

All requests go to `http://localhost:9224/action` with POST method and JSON body:
```json
{"category": "...", "action": "...", "params": {...}}
```

### Projects

List projects:
```json
{"category": "projects", "action": "list", "params": {}}
```

Get project:
```json
{"category": "projects", "action": "get", "params": {"projectId": "PROJECT_ID"}}
```

Create project:
```json
{"category": "projects", "action": "create", "params": {"name": "my-project", "regionId": "aws-us-east-1"}}
```

Delete project:
```json
{"category": "projects", "action": "delete", "params": {"projectId": "PROJECT_ID"}}
```

### Branches

List branches:
```json
{"category": "branches", "action": "list", "params": {"projectId": "PROJECT_ID"}}
```

Create branch:
```json
{"category": "branches", "action": "create", "params": {"projectId": "PROJECT_ID", "name": "dev-branch", "parentId": "PARENT_BRANCH_ID"}}
```

Delete branch:
```json
{"category": "branches", "action": "delete", "params": {"projectId": "PROJECT_ID", "branchId": "BRANCH_ID"}}
```

### SQL Queries

Run query:
```json
{"category": "sql", "action": "run", "params": {"projectId": "PROJECT_ID", "query": "SELECT * FROM users LIMIT 10"}}
```

Parameterized query:
```json
{"category": "sql", "action": "run", "params": {"projectId": "PROJECT_ID", "query": "SELECT * FROM users WHERE id = $1", "params": [123]}}
```

Explain query (SELECT only):
```json
{"category": "sql", "action": "explain", "params": {"projectId": "PROJECT_ID", "query": "SELECT * FROM users WHERE email = 'test@example.com'"}}
```

### Tables

List tables:
```json
{"category": "tables", "action": "list", "params": {"projectId": "PROJECT_ID"}}
```

Describe table:
```json
{"category": "tables", "action": "describe", "params": {"projectId": "PROJECT_ID", "tableName": "users"}}
```

### Databases

List databases in a branch:
```json
{"category": "databases", "action": "list", "params": {"projectId": "PROJECT_ID", "branchId": "BRANCH_ID"}}
```

## Common Workflows

### Explore a Database

1. List projects to find project ID
2. List tables: `{"category": "tables", "action": "list", "params": {"projectId": "..."}}`
3. Describe specific table
4. Run SELECT queries

### Create Development Branch

1. List branches to find main branch ID
2. Create branch with parent
3. Run test queries on new branch
4. Delete branch when done

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
# List projects
curl -X POST http://localhost:9224/action \
  -H "Content-Type: application/json" \
  -d '{"category": "projects", "action": "list", "params": {}}'

# Run SQL query
curl -X POST http://localhost:9224/action \
  -H "Content-Type: application/json" \
  -d '{"category": "sql", "action": "run", "params": {"projectId": "YOUR_PROJECT_ID", "query": "SELECT 1"}}'
```
