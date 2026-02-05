# Issue 5: Sync MCP + Skill to All Tools

**Phase:** 2 (Write Capabilities)
**Status:** Pending

---

## Summary

Add the ability to add an MCP or install a skill to all three tools at once. This is the core "install once → available everywhere" value proposition.

## Acceptance Criteria

### Safe Write Infrastructure (BUILD FIRST)

> ⚠️ **Implementation order**: Build and test safe write infra BEFORE any actual write features. This is the foundation.

- [ ] Atomic writes (write to temp, then rename)
- [ ] Automatic backup before every write (`~/.loadout/backups/`)
- [ ] Format-preserving TOML edits (preserve comments) using `toml_edit`
- [ ] Validation before write (parse result, verify structure)
- [ ] Unit tests for atomic write + backup + rollback

### Add MCP to All Tools
- [ ] Form: name, command, args, env vars
- [ ] Select target tools (checkboxes)
- [ ] Preview generated config (JSON for Claude/Gemini, TOML for Codex)
- [ ] Write to all selected tools
- [ ] Success confirmation with files modified

### Install Skill to All Tools
- [ ] Input: GitHub URL or paste SKILL.md content
- [ ] Parse and validate SKILL.md frontmatter
- [ ] Preview skill content
- [ ] Select target tools (checkboxes)
- [ ] Write to correct path per tool:
  - Claude: `~/.claude/skills/<name>/SKILL.md`
  - Codex: `$HOME/.agents/skills/<name>/SKILL.md`
  - Gemini: `~/.gemini/skills/<name>/SKILL.md`
- [ ] Success confirmation with paths created

## Technical Details

### Safe Write Pattern

```rust
use toml_edit::Document;  // Preserves TOML comments

fn atomic_write(path: &Path, content: &str) -> Result<(), Error> {
    // 1. Backup existing file
    let backup_dir = dirs::home_dir().unwrap().join(".loadout/backups");
    fs::create_dir_all(&backup_dir)?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("{}_{}", path.file_name().unwrap().to_str().unwrap(), timestamp));
    if path.exists() {
        fs::copy(path, &backup_path)?;
    }

    // 2. Write to temp file
    let temp = tempfile::NamedTempFile::new_in(path.parent().unwrap())?;
    temp.write_all(content.as_bytes())?;

    // 3. Atomic rename
    temp.persist(path)?;
    Ok(())
}
```

### MCP Format Conversion

```rust
struct MCPServer {
    name: String,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
}

impl MCPServer {
    fn to_claude_json(&self) -> Value { /* JSON mcpServers format */ }
    fn to_codex_toml(&self) -> Document { /* TOML mcp_servers format */ }
    fn to_gemini_json(&self) -> Value { /* JSON mcpServers format */ }
}
```

### Write Paths

**MCP:**
| Tool | Path | Key |
|------|------|-----|
| Claude | `~/.claude.json` | `mcpServers.<name>` |
| Codex | `~/.codex/config.toml` | `[mcp_servers.<name>]` |
| Gemini | `~/.gemini/settings.json` | `mcpServers.<name>` |

**Skills:**
| Tool | Path |
|------|------|
| Claude | `~/.claude/skills/<name>/SKILL.md` |
| Codex | `$HOME/.agents/skills/<name>/SKILL.md` |
| Gemini | `~/.gemini/skills/<name>/SKILL.md` |

### Rust Crates

- `toml_edit` — format-preserving TOML (not `toml`)
- `reqwest` — fetch skills from GitHub URLs
- `tempfile` — atomic writes
- `chrono` — timestamps for backups

### Files to Create

```
src-tauri/src/
├── commands/sync.rs
├── writers/
│   ├── atomic.rs
│   ├── backup.rs
│   ├── mcp_writer.rs
│   └── skill_writer.rs
├── converters/
│   └── mcp_format.rs

src/
├── components/sync/
│   ├── AddMCPDialog.tsx
│   ├── InstallSkillDialog.tsx
│   ├── ToolSelector.tsx
│   ├── ConfigPreview.tsx
│   └── SuccessConfirmation.tsx
```

## Test Plan

### Add MCP
1. Click "Add MCP" button
2. Fill form: name=`github`, command=`npx`, args=`-y @github/mcp-server`
3. Select all three tools
4. Preview shows JSON (Claude/Gemini) and TOML (Codex)
5. Click "Add"
6. Verify backups created in `~/.loadout/backups/`
7. Verify files updated:
   - `~/.claude.json` has new `mcpServers.github`
   - `~/.codex/config.toml` has new `[mcp_servers.github]`
   - `~/.gemini/settings.json` has new `mcpServers.github`
8. MCP appears in MCP Registry

### Install Skill
1. Click "Install Skill" button
2. Paste GitHub URL: `https://github.com/org/cool-skill`
3. Preview shows skill name, description, content
4. Select Claude + Codex (not Gemini — experimental warning shown)
5. Click "Install"
6. Verify folders created:
   - `~/.claude/skills/cool-skill/SKILL.md`
   - `~/.agents/skills/cool-skill/SKILL.md`
7. Skill appears in Skills list

## Dependencies

- Issue 1: App Bootstrap
- Issue 2: MCP Registry (to refresh after add)
- Issue 3: Skills Scanner (to refresh after install)

## Notes

- **Implementation order**: Safe write infra → MCP sync → Skill install
- **Format preservation is critical** — users have comments in TOML configs
- Always backup before write — users should never lose data
- Handle missing config files gracefully (create with just the new item)
- Show warning for Gemini skills: "Skills are experimental in Gemini CLI"
- Codex MCP key is `mcp_servers` (underscore), not `mcpServers`
