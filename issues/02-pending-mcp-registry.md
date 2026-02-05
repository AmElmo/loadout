# Issue 2: MCP Registry

**Phase:** 1 (Read-Only MVP)
**Status:** Pending

---

## Summary

Scan and display all MCP servers configured across Claude Code, Codex CLI, and Gemini CLI in a unified list with health indicators.

## Acceptance Criteria

- [ ] Rust backend parses MCPs from all three tools:
  - Claude: `~/.claude.json` (user) and `$PROJECT_ROOT/.mcp.json` (project)
  - Codex: `~/.codex/config.toml` → `[mcp_servers.*]` (TOML)
  - Gemini: `~/.gemini/settings.json` → `mcpServers` (JSON)

> **Project root**: Use repo root (`.git` parent) when found, otherwise use selected folder.
- [ ] Tauri command `scan_mcps()` returns unified list
- [ ] MCP list displays: name, source tool badge, command, args, scope (user/project)
- [ ] Health indicator: ✓ healthy / ? unknown (default) / ✗ failed
- [ ] Click MCP to see full config details
- [ ] "In Claude, Codex, Gemini" badges showing where each MCP is configured
- [ ] Empty state when no MCPs configured

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

### Health Check (Opt-In)

**Default state: "unknown"** — guessing ports from command/args produces false negatives.

Health check is opt-in via manual "Test" button per MCP:
1. User clicks "Test" on an MCP
2. Show warning: "This will run: `npx -y @org/mcp-server`"
3. If confirmed, spawn command with 5s timeout
4. Check if MCP responds to protocol handshake
5. Show: ✓ healthy / ✗ failed / ? unknown (default)

**No auto-testing** — executing commands from config is a security risk without explicit consent.

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
7. Health shows "?" (unknown) by default — no auto-testing
8. Click "Test" on an MCP → confirmation dialog shows command
9. Confirm → MCP tested → status updates to ✓ or ✗
10. API keys/secrets are masked (show `***`)
11. Click MCP → see full details

## Dependencies

- Issue 1: App Bootstrap

## Notes

- Key gotcha: Codex uses `mcp_servers` (underscore), Claude/Gemini use `mcpServers`
- Never display secret values — mask with `***` or show only key names
- This is the "aha moment" tab — should feel immediately useful
