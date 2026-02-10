# Issue 2: MCP Registry

**Phase:** 1 (Read-Only MVP)
**Status:** Done

---

## Summary

Scan and display all MCP servers configured across Claude Code, Codex CLI, and Gemini CLI in a unified list with health indicators.

## Acceptance Criteria

- [x] Rust backend parses MCPs from all three tools:
  - Claude: `~/.claude.json` (user) and `$PROJECT_ROOT/.mcp.json` (project)
  - Codex: `~/.codex/config.toml` → `[mcp_servers.*]` (TOML)
  - Gemini: `~/.gemini/settings.json` → `mcpServers` (JSON)

> **Project root**: Use repo root (`.git` parent) when found, otherwise use selected folder.
- [x] Tauri command `scan_mcps()` returns unified list
- [x] MCP list displays: name, source tool badge, command, args, scope (user/project)
- [x] Health indicator shown (default: ? unknown)
- [x] Click MCP to see full config details
- [x] "In Claude, Codex, Gemini" badges showing where each MCP is configured
- [x] Empty state when no MCPs configured

## Technical Details

### MCP Config Locations

| Tool | Location | Format |
|------|----------|--------|
| Claude Code | `~/.claude.json`, `$PROJECT_ROOT/.mcp.json` | JSON: `mcpServers.<name>` |
| Codex CLI | `~/.codex/config.toml` | TOML: `[mcp_servers.<name>]` (underscore!) |
| Gemini CLI | `~/.gemini/settings.json` | JSON: `mcpServers.<name>` |

### Config Formats

**Claude/Gemini (JSON):**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"],
      "env": { "GITHUB_TOKEN": "..." }
    }
  }
}
```

**Codex (TOML):**
```toml
[mcp_servers.github]
command = "npx"
args = ["-y", "@github/mcp-server"]

[mcp_servers.github.env]
GITHUB_TOKEN = "..."
```

### Health Status Scope

This issue only covers MCP status display with default `unknown`.

Active health testing (manual "Test" button, confirmation dialog, protocol handshake, timeouts)
is tracked separately in **Issue 6: MCP Health Testing**.

### LoadoutItem Shape

```typescript
interface MCPItem {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;  // values masked in UI
  configuredIn: ('claude' | 'codex' | 'gemini')[];
  scope: 'user' | 'project';
  path: string;
  health: 'healthy' | 'unknown' | 'failed';  // default: 'unknown'
}
```

### Rust Crates

- `serde` + `serde_json` — JSON parsing
- `toml` — TOML parsing
- `tokio` — async file I/O

### Files to Create

```
src-tauri/src/
├── commands/mcps.rs          # Tauri commands
├── scanners/mcps.rs          # MCP discovery logic
├── parsers/
│   ├── json_config.rs
│   └── toml_config.rs

src/
├── pages/MCPs.tsx
├── components/mcps/
│   ├── MCPList.tsx
│   ├── MCPCard.tsx
│   └── HealthBadge.tsx
```

## Test Plan

1. Configure MCPs in Claude (`~/.claude.json`)
2. Configure MCPs in Codex (`~/.codex/config.toml`)
3. Configure MCPs in Gemini (`~/.gemini/settings.json`)
4. Launch Loadout → MCPs tab
5. See unified list with all MCPs
6. Each shows correct source badges
7. Health shows "?" (unknown) by default
8. No command execution occurs in MCP registry scan flow
10. API keys/secrets are masked (show `***`)
11. Click MCP → see full details

## Dependencies

- Issue 1: App Bootstrap

## Notes

- Key gotcha: Codex uses `mcp_servers` (underscore), Claude/Gemini use `mcpServers`
- Never display secret values — mask with `***` or show only key names
- This is the "aha moment" tab — should feel immediately useful
