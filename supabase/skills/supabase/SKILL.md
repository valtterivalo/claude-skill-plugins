---
name: supabase
description: Query and manage Supabase databases - select, insert, update, delete data, call RPC functions, list tables. Use when the user asks about Supabase databases or wants to interact with their Supabase project.
---

# Supabase Skill

Interact with Supabase databases through a local HTTP server.

## Before Using This Skill

### 1. Check if Server is Running

```bash
curl -s http://localhost:9227/health 2>/dev/null || echo "not running"
```

### 2. Start Server if Not Running

```bash
./skills/supabase/server.sh &
```

Wait a moment, then verify:

```bash
curl -s http://localhost:9227/health
```

### 3. Handle Missing Configuration

If the server exits with setup instructions, guide the user:

1. Create config directory:
   ```bash
   mkdir -p ~/.config/supabase-plugin
   ```

2. Get your project URL and service key from Supabase:
   - Go to Project Dashboard > Settings > API
   - Copy the Project URL (e.g., `https://xxxxx.supabase.co`)
   - Copy the service_role key (NOT the anon key)

3. Create the config file:
   ```bash
   cat > ~/.config/supabase-plugin/.env << EOF
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbG...
   EOF
   ```

4. Restart the server

## API Reference

All requests go to `http://localhost:9227/action` with POST method and JSON body:
```json
{"category": "...", "action": "...", "params": {...}}
```

### Data Operations

**Select data:**
```json
{"category": "data", "action": "select", "params": {
  "table": "users",
  "columns": "id, name, email",
  "filter": [{"column": "status", "op": "eq", "value": "active"}],
  "order": {"column": "created_at", "ascending": false},
  "limit": 10
}}
```

Available filter operators:
- `eq`, `neq` - equals, not equals
- `gt`, `gte`, `lt`, `lte` - greater/less than
- `like`, `ilike` - pattern matching (ilike is case-insensitive)
- `is` - for null/boolean checks
- `in` - value in array
- `contains`, `containedBy`, `overlaps` - array operations

**Select single row:**
```json
{"category": "data", "action": "select", "params": {
  "table": "users",
  "filter": [{"column": "id", "op": "eq", "value": 123}],
  "single": true
}}
```

**Insert data:**
```json
{"category": "data", "action": "insert", "params": {
  "table": "users",
  "data": {"name": "John", "email": "john@example.com"},
  "returning": "*"
}}
```

**Insert multiple rows:**
```json
{"category": "data", "action": "insert", "params": {
  "table": "users",
  "data": [
    {"name": "John", "email": "john@example.com"},
    {"name": "Jane", "email": "jane@example.com"}
  ]
}}
```

**Update data:**
```json
{"category": "data", "action": "update", "params": {
  "table": "users",
  "data": {"status": "inactive"},
  "filter": [{"column": "id", "op": "eq", "value": 123}],
  "returning": "*"
}}
```

**Upsert data:**
```json
{"category": "data", "action": "upsert", "params": {
  "table": "users",
  "data": {"id": 123, "name": "John Updated"},
  "onConflict": "id",
  "returning": "*"
}}
```

**Delete data:**
```json
{"category": "data", "action": "delete", "params": {
  "table": "users",
  "filter": [{"column": "id", "op": "eq", "value": 123}],
  "returning": "*"
}}
```

### RPC Functions

**Call a stored procedure:**
```json
{"category": "rpc", "action": "call", "params": {
  "function": "get_user_stats",
  "args": {"user_id": 123}
}}
```

### Table Introspection

**List tables:**
```json
{"category": "tables", "action": "list", "params": {"schema": "public"}}
```

**Describe table columns:**
```json
{"category": "tables", "action": "describe", "params": {
  "table": "users",
  "schema": "public"
}}
```

### Functions

**List RPC functions:**
```json
{"category": "functions", "action": "list", "params": {"schema": "public"}}
```

## Filter Examples

**Multiple conditions (AND):**
```json
{"category": "data", "action": "select", "params": {
  "table": "orders",
  "filter": [
    {"column": "status", "op": "eq", "value": "pending"},
    {"column": "total", "op": "gte", "value": 100}
  ]
}}
```

**Pattern matching:**
```json
{"category": "data", "action": "select", "params": {
  "table": "users",
  "filter": [{"column": "email", "op": "ilike", "value": "%@gmail.com"}]
}}
```

**Array contains:**
```json
{"category": "data", "action": "select", "params": {
  "table": "posts",
  "filter": [{"column": "tags", "op": "contains", "value": ["featured"]}]
}}
```

**Null check:**
```json
{"category": "data", "action": "select", "params": {
  "table": "users",
  "filter": [{"column": "deleted_at", "op": "is", "value": null}]
}}
```

## Response Format

Success:
```json
{"success": true, "data": [...]}
```

Error:
```json
{"success": false, "error": "Error message"}
```

## Curl Examples

```bash
# Check available categories
curl -s http://localhost:9227/categories

# List tables
curl -X POST http://localhost:9227/action \
  -H "Content-Type: application/json" \
  -d '{"category": "tables", "action": "list", "params": {}}'

# Select data
curl -X POST http://localhost:9227/action \
  -H "Content-Type: application/json" \
  -d '{"category": "data", "action": "select", "params": {"table": "users", "limit": 5}}'

# Insert data
curl -X POST http://localhost:9227/action \
  -H "Content-Type: application/json" \
  -d '{"category": "data", "action": "insert", "params": {"table": "users", "data": {"name": "Test"}}}'
```

## Introspection Note

Table and function listing requires either:
1. RPC functions in your database for introspection, or
2. Access to `information_schema` views

If introspection fails, you may need to create helper functions:

```sql
CREATE OR REPLACE FUNCTION get_tables_info(target_schema text DEFAULT 'public')
RETURNS TABLE(table_name text, table_schema text, table_type text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT table_name::text, table_schema::text, table_type::text
  FROM information_schema.tables
  WHERE table_schema = target_schema;
$$;

CREATE OR REPLACE FUNCTION get_table_columns(target_table text, target_schema text DEFAULT 'public')
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT column_name::text, data_type::text, is_nullable::text, column_default::text
  FROM information_schema.columns
  WHERE table_name = target_table AND table_schema = target_schema;
$$;
```
