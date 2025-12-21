# Skill Plugins

A collection of skill plugins for Claude Code.

## Available Plugins

| Plugin | Description |
|--------|-------------|
| [neon](./neon/) | Manage Neon PostgreSQL databases - projects, branches, SQL queries |

## Installation

Install the marketplace:

```bash
/plugins add https://github.com/valtterivalo/claude-skill-plugins
```

Then install individual plugins:

```bash
/plugins install neon
```

## Plugin Structure

Each plugin follows this structure:

```
plugin-name/
├── skills/
│   └── skill-name/
│       ├── SKILL.md          # Instructions for Claude
│       ├── server.sh         # Startup script
│       ├── package.json
│       └── src/              # Implementation
└── README.md                 # Plugin documentation
```

## Security

- API keys are stored in user's home directory (`~/.config/<plugin>/`), not in plugin directories
- Servers bind to localhost only (127.0.0.1)
- Error messages are sanitized to prevent information leakage
- Input validation prevents injection attacks

## License

MIT
