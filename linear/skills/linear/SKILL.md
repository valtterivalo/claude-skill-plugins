---
name: linear
description: Manage Linear issues and projects - search, create, update issues, track sprints, manage projects. Use when the user asks about Linear issues, wants to create tickets, or manage project work.
---

# Linear Skill

Interact with Linear issue tracker through a local HTTP server.

## Before Using This Skill

### 1. Check if Server is Running

```bash
curl -s http://localhost:9226/health 2>/dev/null || echo "not running"
```

### 2. Start Server if Not Running

```bash
./skills/linear/server.sh &
```

Wait a moment, then verify:

```bash
curl -s http://localhost:9226/health
```

### 3. Handle Missing Configuration

If the server exits with setup instructions, guide the user:

1. Create config directory:
   ```bash
   mkdir -p ~/.config/linear-plugin
   ```

2. Get a Personal API key from Linear:
   - Go to Settings > Account > Security & Access
   - Under "Personal API keys", click "Create key"
   - Copy the key (starts with `lin_api_`)

3. Create the config file:
   ```bash
   echo "LINEAR_API_KEY=lin_api_..." > ~/.config/linear-plugin/.env
   ```

4. Restart the server

## API Reference

All requests go to `http://localhost:9226/action` with POST method and JSON body:
```json
{"category": "...", "action": "...", "params": {...}}
```

### Issues

List issues:
```json
{"category": "issues", "action": "list", "params": {}}
```

List issues for a team:
```json
{"category": "issues", "action": "list", "params": {"teamKey": "ENG"}}
```

Search issues:
```json
{"category": "issues", "action": "search", "params": {"query": "authentication bug"}}
```

Get issue by identifier:
```json
{"category": "issues", "action": "get", "params": {"issueId": "ENG-123"}}
```

Create issue:
```json
{"category": "issues", "action": "create", "params": {"teamId": "TEAM_UUID", "title": "Fix login bug", "description": "Users can't log in", "priority": 2}}
```

Priority values: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low

Update issue:
```json
{"category": "issues", "action": "update", "params": {"issueId": "ENG-123", "stateId": "STATE_UUID", "assigneeId": "USER_UUID"}}
```

Archive issue:
```json
{"category": "issues", "action": "archive", "params": {"issueId": "ENG-123"}}
```

Assign issue:
```json
{"category": "issues", "action": "assign", "params": {"issueId": "ENG-123", "assigneeId": "USER_UUID"}}
```

Add label:
```json
{"category": "issues", "action": "add_label", "params": {"issueId": "ENG-123", "labelId": "LABEL_UUID"}}
```

Assign to cycle:
```json
{"category": "issues", "action": "set_cycle", "params": {"issueId": "ENG-123", "cycleId": "CYCLE_UUID"}}
```

### Projects

List projects:
```json
{"category": "projects", "action": "list", "params": {}}
```

Get project:
```json
{"category": "projects", "action": "get", "params": {"projectId": "PROJECT_UUID"}}
```

Create project update:
```json
{"category": "projects", "action": "create_update", "params": {"projectId": "PROJECT_UUID", "body": "Sprint completed successfully", "health": "onTrack"}}
```

Health values: "onTrack", "atRisk", "offTrack"

### Teams

List teams (includes workflow states):
```json
{"category": "teams", "action": "list", "params": {}}
```

Get team details:
```json
{"category": "teams", "action": "get", "params": {"teamId": "TEAM_UUID"}}
```

### Comments

List comments on issue:
```json
{"category": "comments", "action": "list", "params": {"issueId": "ENG-123"}}
```

Create comment:
```json
{"category": "comments", "action": "create", "params": {"issueId": "ENG-123", "body": "This is fixed in the latest deploy"}}
```

### Users

Get current user:
```json
{"category": "users", "action": "me", "params": {}}
```

List users:
```json
{"category": "users", "action": "list", "params": {}}
```

List team members:
```json
{"category": "users", "action": "list", "params": {"teamId": "TEAM_UUID"}}
```

### Cycles

List cycles for a team:
```json
{"category": "cycles", "action": "list", "params": {"teamId": "TEAM_UUID"}}
```

Get cycle details:
```json
{"category": "cycles", "action": "get", "params": {"cycleId": "CYCLE_UUID"}}
```

### Labels

List all labels:
```json
{"category": "labels", "action": "list", "params": {}}
```

List labels for a team:
```json
{"category": "labels", "action": "list", "params": {"teamId": "TEAM_UUID"}}
```

## Common Workflows

### Create and Assign an Issue

1. List teams to get team ID and workflow states
2. List users to get assignee ID
3. Create issue with team, title, and assignee

### Move Issue Through Workflow

1. Get team to see available states
2. Update issue with new stateId

### Add to Sprint

1. List cycles for the team
2. Set cycle on the issue

## ID Formats

Linear accepts both formats:
- UUID: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Identifier: `ENG-123`, `PROD-456`

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
# List teams
curl -X POST http://localhost:9226/action \
  -H "Content-Type: application/json" \
  -d '{"category": "teams", "action": "list", "params": {}}'

# Search issues
curl -X POST http://localhost:9226/action \
  -H "Content-Type: application/json" \
  -d '{"category": "issues", "action": "search", "params": {"query": "bug"}}'

# Get current user
curl -X POST http://localhost:9226/action \
  -H "Content-Type: application/json" \
  -d '{"category": "users", "action": "me", "params": {}}'
```
