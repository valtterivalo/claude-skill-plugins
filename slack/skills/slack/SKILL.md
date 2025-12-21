---
name: slack
description: Send messages, manage channels, list users, add reactions in Slack. Use when the user asks about Slack messaging, channels, or workspace management.
---

# Slack Skill

Interact with Slack workspaces through a local HTTP server.

## Before Using This Skill

### 1. Check if Server is Running

```bash
curl -s http://localhost:9228/health 2>/dev/null || echo "not running"
```

### 2. Start Server if Not Running

```bash
cd ~/.claude/plugins/skill-plugins/slack/skills/slack && ./server.sh &
```

Wait a moment, then verify:

```bash
curl -s http://localhost:9228/health
```

### 3. Handle Missing Configuration

If the server exits with setup instructions, guide the user:

1. Create config directory:
   ```bash
   mkdir -p ~/.config/slack-plugin
   ```

2. Create a Slack app at https://api.slack.com/apps

3. Add these bot token scopes under OAuth & Permissions:
   - `channels:read`, `channels:join`, `channels:manage`
   - `groups:read`, `im:read`, `mpim:read`
   - `chat:write`
   - `reactions:read`, `reactions:write`
   - `users:read`, `users:read.email`
   - `files:read`

4. Install the app to your workspace

5. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

6. Create the config file:
   ```bash
   echo "SLACK_BOT_TOKEN=xoxb-..." > ~/.config/slack-plugin/.env
   ```

7. Restart the server

## API Reference

All requests go to `http://localhost:9228/action` with POST method and JSON body:
```json
{"category": "...", "action": "...", "params": {...}}
```

### Channels

List channels:
```json
{"category": "channels", "action": "list", "params": {}}
```

List with options:
```json
{"category": "channels", "action": "list", "params": {"types": ["public_channel", "private_channel"], "limit": 50}}
```

Get channel info:
```json
{"category": "channels", "action": "info", "params": {"channelId": "C0123456789"}}
```

Get channel members:
```json
{"category": "channels", "action": "members", "params": {"channelId": "C0123456789", "limit": 100}}
```

Create channel:
```json
{"category": "channels", "action": "create", "params": {"name": "new-channel", "isPrivate": false}}
```

Archive channel:
```json
{"category": "channels", "action": "archive", "params": {"channelId": "C0123456789"}}
```

Join channel:
```json
{"category": "channels", "action": "join", "params": {"channelId": "C0123456789"}}
```

### Messages

Post message:
```json
{"category": "messages", "action": "post", "params": {"channel": "C0123456789", "text": "Hello world!"}}
```

Post with blocks (rich formatting):
```json
{"category": "messages", "action": "post", "params": {"channel": "C0123456789", "text": "Fallback text", "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": "*Bold* and _italic_"}}]}}
```

Reply in thread:
```json
{"category": "messages", "action": "post", "params": {"channel": "C0123456789", "text": "Thread reply", "threadTs": "1234567890.123456"}}
```

Update message:
```json
{"category": "messages", "action": "update", "params": {"channel": "C0123456789", "ts": "1234567890.123456", "text": "Updated text"}}
```

Delete message:
```json
{"category": "messages", "action": "delete", "params": {"channel": "C0123456789", "ts": "1234567890.123456"}}
```

Get message history:
```json
{"category": "messages", "action": "history", "params": {"channel": "C0123456789", "limit": 20}}
```

### Users

List users:
```json
{"category": "users", "action": "list", "params": {"limit": 100}}
```

Get user info:
```json
{"category": "users", "action": "info", "params": {"userId": "U0123456789"}}
```

Find user by email:
```json
{"category": "users", "action": "lookup_by_email", "params": {"email": "user@example.com"}}
```

Get bot identity:
```json
{"category": "users", "action": "me", "params": {}}
```

### Reactions

Add reaction:
```json
{"category": "reactions", "action": "add", "params": {"channel": "C0123456789", "timestamp": "1234567890.123456", "name": "thumbsup"}}
```

Remove reaction:
```json
{"category": "reactions", "action": "remove", "params": {"channel": "C0123456789", "timestamp": "1234567890.123456", "name": "thumbsup"}}
```

Get reactions on message:
```json
{"category": "reactions", "action": "get", "params": {"channel": "C0123456789", "timestamp": "1234567890.123456"}}
```

### Files

List files:
```json
{"category": "files", "action": "list", "params": {"limit": 20}}
```

List files in channel:
```json
{"category": "files", "action": "list", "params": {"channel": "C0123456789", "limit": 20}}
```

Get file info:
```json
{"category": "files", "action": "info", "params": {"fileId": "F0123456789"}}
```

## Common Workflows

### Send a Message and React to It

1. Post message to get the timestamp
2. Use the timestamp to add a reaction

### Get Recent Messages and Reply

1. Get history for the channel
2. Use a message's `ts` as `threadTs` when posting a reply

### Find User and Send DM

1. Lookup user by email
2. Post message using the user ID as the channel

## ID Formats

- Channel IDs: Start with `C` (public), `G` (private), `D` (DM)
- User IDs: Start with `U` or `W`
- File IDs: Start with `F`
- Timestamps: Format `1234567890.123456`

## Emoji Names

Use emoji names without colons: `thumbsup`, `heart`, `rocket`, `white_check_mark`

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
# Check available categories
curl -s http://localhost:9228/categories

# List channels
curl -X POST http://localhost:9228/action \
  -H "Content-Type: application/json" \
  -d '{"category": "channels", "action": "list", "params": {}}'

# Post a message
curl -X POST http://localhost:9228/action \
  -H "Content-Type: application/json" \
  -d '{"category": "messages", "action": "post", "params": {"channel": "C0123456789", "text": "Hello!"}}'

# Get bot identity
curl -X POST http://localhost:9228/action \
  -H "Content-Type: application/json" \
  -d '{"category": "users", "action": "me", "params": {}}'
```
