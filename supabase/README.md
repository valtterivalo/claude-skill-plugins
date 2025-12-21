# Supabase Plugin

Query and manage Supabase databases from Claude Code - CRUD operations, RPC functions, and table introspection.

## Installation

If installing from the marketplace:

```bash
/plugins install supabase
```

## Configuration

The plugin stores configuration in your home directory, separate from the plugin files:

```bash
mkdir -p ~/.config/supabase-plugin
cat > ~/.config/supabase-plugin/.env << EOF
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
EOF
```

### Getting Your Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**
4. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
5. Copy the **service_role** key (NOT the anon key - it bypasses RLS)

### API Key Types

- **anon/public**: Client-safe, respects Row Level Security (RLS)
- **service_role**: Full database access, bypasses RLS (use this for the plugin)

## Features

- **Data Operations** - Select, insert, update, upsert, delete with rich filtering
- **RPC Functions** - Call stored procedures/functions
- **Table Introspection** - List tables, describe columns
- **Filter Operations** - eq, neq, gt, gte, lt, lte, like, ilike, in, contains, etc.

## Security

- Credentials stored in `~/.config/supabase-plugin/`, not in plugin directory
- Server binds to localhost only (127.0.0.1)
- Error messages are sanitized to prevent information leakage
- Input validation via Zod schemas

## Usage

Once configured, Claude will automatically start the server when you ask about Supabase. Example prompts:

- "Show me the tables in my Supabase database"
- "Query all users where status is active"
- "Insert a new record into the orders table"
- "Call the get_user_stats function with user_id 123"

## Filter Operators

| Operator | Description |
|----------|-------------|
| eq, neq | Equals, not equals |
| gt, gte, lt, lte | Greater/less than (or equal) |
| like, ilike | Pattern matching (ilike is case-insensitive) |
| is | Null/boolean check |
| in | Value in array |
| contains | Array contains values |
| containedBy | Array is contained by values |
| overlaps | Arrays have common elements |

## Troubleshooting

**Server won't start**: Check that `~/.config/supabase-plugin/.env` exists and contains both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

**Authentication errors**: Verify your service key hasn't been regenerated in the dashboard.

**Introspection not working**: Some Supabase setups may need helper RPC functions. See SKILL.md for SQL to create them.

**Permission errors**: Ensure you're using the service_role key, not the anon key.
