# MCP Configuration Rules

## Configuration Sources

MCP servers are configured in multiple locations:

### User-Level (always scanned on app launch)
- `~/.claude.json` - Claude CLI (uses `mcpServers` camelCase)
- `~/.codex/config.toml` - Codex (uses `mcp_servers` snake_case)
- `~/.gemini/settings.json` - Gemini (uses `mcpServers` camelCase)

### Project-Level (scanned per workspace)
- `.mcp.json` in project root

## MCP Types

MCPs can be either:
- **stdio**: Command-line based with `command` and optional `args`
- **http**: URL-based with `url` field only

Never assume `command` is always present - HTTP MCPs only have a `url`.

## Parsing Considerations

- Claude and Gemini use `mcpServers` (camelCase) in JSON
- Codex uses `mcp_servers` (snake_case) in TOML
- Use `#[serde(default)]` for optional fields that may be missing
- Always verify file paths exist before scanning (e.g., `~/.claude.json` not `~/.claude/settings.json`)

## UI Patterns

### Favicons for HTTP MCPs
- Use Google's favicon service: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
- Extract the **root domain** for better results (e.g., `linear.app` not `mcp.linear.app`)
- Subdomains often don't host their own favicons

### Letter Avatars for stdio MCPs
- Generate consistent colored avatars using name-based hashing
- First letter of the MCP name with a deterministic background color

## Scoping Best Practices

- Distinguish between "user-level" and "project-level" MCPs in the UI
- Display user-level MCPs immediately on app launch (don't wait for workspace selection)
- Complex features like MCP health testing should be deferred to separate issues
