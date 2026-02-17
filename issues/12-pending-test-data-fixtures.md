# Issue 12: Test Data Fixtures for Screenshots & Demos

**Phase:** 1 (Read-Only MVP)
**Status:** Pending

---

## Summary

Create a self-contained test data setup so we can take product screenshots, record demos, and develop the UI without touching the developer's real AI coding configuration (`~/.claude.json`, `~/.gemini/settings.json`, etc.). The test data must be editable, look realistic, exercise the full parsing/scanning pipeline, and be completely isolated from the main app logic.

## Problem

Today all scanners (`scan_all_mcps`, `scan_all_skills`, `scan_all_prompts`, `scan_all_hooks`, `discover_workspaces`) call `dirs::home_dir()` directly with no override. This means:

- Screenshots show your actual MCP servers, skills, and rules
- You can't craft a "perfect" dataset with diverse entries for marketing
- Testing edge cases (many items, long names, errors) requires modifying real configs
- Onboarding new contributors forces them to set up real AI tool configs

## Approach: Fake Home Directory with `LOADOUT_HOME`

Introduce a single environment variable `LOADOUT_HOME` that overrides `dirs::home_dir()` across all scanners, guarded by `#[cfg(debug_assertions)]` so it is compiled out of release builds entirely. Ship a `fixtures/` directory in the repo with realistic config files.

### Why this approach

- **Full stack testing**: exercises the real Rust parsers, scanners, and frontend rendering — no mocks
- **Zero production impact**: `#[cfg(debug_assertions)]` strips the env var check from release binaries — the code literally doesn't exist in `pnpm tauri build` output
- **Easy to use**: one env var, two npm scripts
- **Editable by anyone**: fixtures are plain `.json`, `.toml`, `.md` files — no Rust knowledge needed
- **Future-proof**: doubles as infrastructure for integration tests

### Usage

```bash
pnpm dev            # real data — your actual ~ configs
pnpm dev:fixtures   # test data — uses fixtures/home/ as fake ~
```

## Acceptance Criteria

### Rust changes
- [ ] Add `effective_home()` helper in `src-tauri/src/helpers.rs` (or similar) that checks `LOADOUT_HOME` behind `#[cfg(debug_assertions)]`, falls back to `dirs::home_dir()`
- [ ] Replace all `dirs::home_dir()` calls with `effective_home()` in: `scanners/mcps.rs`, `scanners/skills.rs`, `scanners/prompts.rs`, `scanners/hooks.rs`, `scanners/workspaces.rs`, `commands/sync.rs`, `commands/mcps.rs`
- [ ] Verify `pnpm tauri build` (release) produces identical behavior — no env var check in binary

### Fixture files
- [ ] `fixtures/home/.claude.json` — user-level MCPs for Claude (stdio + HTTP mix)
- [ ] `fixtures/home/.claude/settings.json` — hooks + permissions
- [ ] `fixtures/home/.claude/CLAUDE.md` — global rules
- [ ] `fixtures/home/.claude/rules/*.md` — scoped rule files
- [ ] `fixtures/home/.claude/skills/*/SKILL.md` — user-level skills (YAML frontmatter)
- [ ] `fixtures/home/.claude/commands/*.md` — legacy commands (plain markdown)
- [ ] `fixtures/home/.codex/config.toml` — user-level MCPs for Codex
- [ ] `fixtures/home/.codex/AGENTS.md` — Codex global rules
- [ ] `fixtures/home/.gemini/settings.json` — Gemini MCPs + hooks + experiments
- [ ] `fixtures/home/.gemini/GEMINI.md` — Gemini global rules
- [ ] `fixtures/workspaces/acme-app/.git/` — empty dir (repo marker)
- [ ] `fixtures/workspaces/acme-app/.mcp.json` — project-level MCPs
- [ ] `fixtures/workspaces/acme-app/CLAUDE.md` — project-level rules
- [ ] `fixtures/workspaces/acme-app/.claude/skills/*/SKILL.md` — project-level skills

### npm scripts
- [ ] Add `"dev:fixtures"` script to `package.json`: `LOADOUT_HOME=./fixtures/home tauri dev`
- [ ] Existing `"dev"` script unchanged

## Technical Details

### `effective_home()` implementation

```rust
use std::path::PathBuf;

pub fn effective_home() -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    if let Ok(home) = std::env::var("LOADOUT_HOME") {
        return Some(PathBuf::from(home));
    }
    dirs::home_dir()
}
```

In release builds (`pnpm tauri build`), the compiler strips the `#[cfg(debug_assertions)]` block. The function compiles to exactly `dirs::home_dir()`.

### Call sites to update

| File | Current call | Notes |
|------|-------------|-------|
| `scanners/mcps.rs` | `dirs::home_dir()` | User-level MCP scanning |
| `scanners/skills.rs` | `dirs::home_dir()` | User-level skill scanning |
| `scanners/prompts.rs` | `dirs::home_dir()` | Global rules scanning |
| `scanners/hooks.rs` | `dirs::home_dir()` | Hook settings scanning |
| `scanners/workspaces.rs` | `dirs::home_dir()` | Workspace discovery (walks from ~) |
| `commands/sync.rs` | `dirs::home_dir()` | Config path for sync/write |
| `commands/mcps.rs` | `dirs::home_dir()` | Keychain/env var resolution |

### Fixture data contents

**MCPs (9 entries across 3 tools):**

| Name | Type | Tool | Scope |
|------|------|------|-------|
| github | stdio | Claude | user |
| linear | http | Claude | user |
| filesystem | stdio | Claude | user |
| brave-search | stdio | Claude | user |
| notion | http | Claude | user |
| postgres | stdio | Codex | user |
| slack | stdio | Codex | user |
| sentry | stdio | Gemini | user |
| supabase | stdio | Claude | project (acme-app) |

**Skills (5 entries):**

| Name | Format | Tool | Scope |
|------|--------|------|-------|
| code-review | YAML frontmatter | Claude | user |
| test-writer | YAML frontmatter | Claude | user |
| commit | plain markdown | Claude (legacy command) | user |
| debug-helper | YAML frontmatter | Claude | project |
| deploy | YAML frontmatter | Codex | user |

**Rules (6 entries):**

| File | Tool | Scope |
|------|------|-------|
| `~/.claude/CLAUDE.md` | Claude | global |
| `~/.claude/rules/code-style.md` | Claude | global |
| `~/.claude/rules/testing.md` | Claude | global |
| `~/.codex/AGENTS.md` | Codex | global |
| `~/.gemini/GEMINI.md` | Gemini | global |
| `acme-app/CLAUDE.md` | Claude | project |

**Hooks (3 entries):**

| Event | Tool | Matcher |
|-------|------|---------|
| PreToolUse | Claude | `Bash\|Write` |
| PostToolUse | Claude | (none — all tools) |
| BeforeTool | Gemini | `shell` |

### Concrete fixture file examples

**`fixtures/home/.claude.json`**
```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx" }
    },
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/sse",
      "headers": { "x-api-key": "${LINEAR_API_KEY}" }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/demo/projects"]
    },
    "brave-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": { "BRAVE_API_KEY": "BSA_xxxxxxxxxxxx" }
    },
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.so/mcp"
    }
  }
}
```

**`fixtures/home/.codex/config.toml`**
```toml
model = "o3"
approval_policy = "on-request"

[mcp_servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/demo"]

[mcp_servers.slack]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-slack"]

[mcp_servers.slack.env]
SLACK_BOT_TOKEN = "xoxb-xxxxxxxxxxxx"
```

**`fixtures/home/.gemini/settings.json`**
```json
{
  "mcpServers": {
    "sentry": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"]
    }
  },
  "experiments": { "enableHooks": true },
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "shell",
        "hooks": [{ "type": "command", "command": "echo 'Tool starting'" }]
      }
    ]
  }
}
```

**`fixtures/home/.claude/settings.json`**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write",
        "hooks": [{ "type": "command", "command": "echo 'Pre-tool hook'" }]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [{ "type": "command", "command": "/usr/local/bin/notify-done" }]
      }
    ]
  },
  "permissions": {
    "allow": ["Read", "Glob", "Grep"],
    "deny": []
  }
}
```

**`fixtures/home/.claude/skills/code-review/SKILL.md`**
```markdown
---
name: code-review
description: Review code for bugs, security issues, and best practices
metadata:
  role: engineering
---
# Code Review

Review the provided code for:
1. Potential bugs and edge cases
2. Security vulnerabilities
3. Performance issues
```

**`fixtures/workspaces/acme-app/.mcp.json`**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": { "SUPABASE_URL": "https://abc.supabase.co" }
    }
  }
}
```

### Project-level fixture workflow

The workspace path for project-level scanning already comes as a parameter from the frontend. So to test project-level data:

1. Launch with `pnpm dev:fixtures`
2. Use the workspace picker to open `fixtures/workspaces/acme-app/`
3. The app reads project-level `.mcp.json`, skills, and rules from that directory — no special handling needed

## Test Plan

1. Run `pnpm dev:fixtures` — app launches with fixture data
2. Verify MCPs page shows 9 entries across Claude, Codex, Gemini (user-level)
3. Select `fixtures/workspaces/acme-app` as workspace — verify `supabase` appears as project-level MCP
4. Verify Skills page shows 5 entries with correct tool badges and scopes
5. Verify Rules page shows 6 entries across global and project scopes
6. Verify Hooks page shows 3 hook entries
7. Run `pnpm dev` — verify app shows your real configs (no fixture data)
8. Run `pnpm tauri build` — verify release binary has no `LOADOUT_HOME` behavior (set the env var and confirm it's ignored)

## Dependencies

- None (standalone improvement)

## Notes

- The `tempfile` crate is already used in existing unit tests for the same pattern — this is consistent with existing conventions
- The workspace path for project-level scanning already comes as a parameter from the frontend, so project-level fixtures just need a `fixtures/workspaces/` directory passed via the UI
- Fixture files use realistic but fake credentials (e.g., `ghp_xxxxxxxxxxxx`) — these are not real tokens
- `#[cfg(debug_assertions)]` is the standard Rust mechanism for dev-only code, no custom feature flags needed
