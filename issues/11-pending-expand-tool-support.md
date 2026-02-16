# Issue 11: Expand Tool Support — Cursor, Copilot, Windsurf, Amp, Roo Code

**Phase:** 3 (Ecosystem Expansion)
**Status:** Pending

---

## Summary

Add support for 5 additional AI coding tools and introduce automatic tool detection so the UI only shows tools the user actually has installed. These 5 tools were selected because they require no new config parsers (all JSON or Markdown — no YAML), reuse existing scanner patterns, and cover the most popular tools in the ecosystem.

### Why These 5

| Tool | Users / Popularity | Why Easy |
|------|-------------------|----------|
| **Cursor** | ~1M+ users, dominant AI editor | MCP uses same JSON shape as Claude; rules are markdown with frontmatter (like Claude scoped rules) |
| **GitHub Copilot** | 20M+ users, 42% market share | Just markdown files in `.github/` — trivial to scan |
| **Windsurf** | Leading free AI editor | Plain markdown rules in `.windsurf/rules/` |
| **Amp** | Sourcegraph's agentic tool | Uses `.agents/skills/` — same path convention Codex already uses |
| **Roo Code** | Growing VS Code extension | Markdown rules in `.roo/`, shares `.agents/skills/` for skills |

### What We're NOT Adding (Yet)

**Continue.dev** is deferred to a separate issue because it uses YAML config (`~/.continue/config.yaml`). This would require adding the `serde_yaml` crate as a new dependency and a new parser pattern. Not hard, but a distinct chunk of work that shouldn't block the 5 above.

---

## Acceptance Criteria

### 1. Auto-Detection of Installed Tools

> This is a prerequisite for the rest. With 8 tools total, showing all of them as filters would be noisy. Only show what's relevant.

- [ ] New Tauri command `detect_installed_tools` returns a list of tools found on the user's machine
- [ ] Detection runs on app launch (lightweight — just checks if paths exist)
- [ ] Detection checks both user-level config dirs AND CLI binaries in PATH
- [ ] Frontend receives detected tools and only renders those as filter buttons
- [ ] Sync dialogs (AddMCP, InstallSkill, etc.) only offer detected tools as targets
- [ ] If a tool is not detected but items from it appear in scan results (e.g., project-level Cursor config), still show it

#### Detection Strategies

| Tool | User-Level Detection | CLI Detection |
|------|---------------------|---------------|
| Claude | `~/.claude/` dir or `~/.claude.json` exists | `which claude` |
| Codex | `~/.codex/` dir exists | `which codex` |
| Gemini | `~/.gemini/` dir exists | `which gemini` |
| Cursor | `~/.cursor/` dir exists | `which cursor` |
| Copilot | N/A (no user-level config) | N/A (VS Code extension) |
| Windsurf | `~/.windsurf/` dir exists | `which windsurf` |
| Amp | `~/.amp/` or `~/.config/amp/` dir exists | `which amp` |
| Roo Code | N/A (VS Code extension) | N/A |

**Special cases:**
- **Copilot**: Detected only when a workspace has `.github/copilot-instructions.md` or `.github/instructions/` — it's project-level only
- **Roo Code**: Detected when a workspace has `.roo/` directory — it's project-level only
- Both should also appear if their items show up in any scan results

### 2. Cursor Support

#### MCPs
- [ ] Scan `$PROJECT_ROOT/.cursor/mcp.json` for project-level MCPs
- [ ] JSON format uses `mcpServers` key (same shape as Claude)
- [ ] Reuse `parse_claude_config()` — identical JSON structure
- [ ] Supports both stdio and HTTP MCP types

#### Rules
- [ ] Scan `$PROJECT_ROOT/.cursor/rules/*.mdc` for project-level rules
- [ ] `.mdc` format: optional YAML-like header with `description` and `globs` fields, then markdown body
- [ ] Parse glob scoping from header (maps to existing `scopedPaths` field on `PromptFile`)
- [ ] Rules can be: always active, manually invoked (via `@mention`), or auto-attached by glob
- [ ] No user-level rules (Cursor is project-scoped only)

#### Sync
- [ ] "Sync to Cursor" writes MCP entry to `$PROJECT_ROOT/.cursor/mcp.json`
- [ ] "Sync to Cursor" writes rule file to `$PROJECT_ROOT/.cursor/rules/<name>.mdc`

### 3. GitHub Copilot Support

#### Rules (Instructions)
- [ ] Scan `$PROJECT_ROOT/.github/copilot-instructions.md` — single repo-wide instruction file
- [ ] Scan `$PROJECT_ROOT/.github/instructions/**/*.instructions.md` — file-scoped instructions
- [ ] File-scoped instructions use YAML frontmatter with `applyTo` glob pattern → maps to `scopedPaths`
- [ ] No user-level config (Copilot instructions are always project-level)

#### No MCPs, Skills, or Hooks
- Copilot does not support MCP servers, skills, or hooks
- In sync dialogs, Copilot should only appear for rules/prompts sync, not MCPs or skills

### 4. Windsurf Support

#### Rules
- [ ] Scan `$PROJECT_ROOT/.windsurf/rules/*.md` for project-level rules
- [ ] Plain markdown format (no special frontmatter needed)
- [ ] Windsurf rules can be: always-on, `@mentionable`, or glob-matched
- [ ] Map glob-matched rules to `scopedPaths` on `PromptFile`
- [ ] No user-level rules path documented

#### No MCPs (Windsurf manages MCP internally via UI)
- Windsurf has MCP support but configuration is managed through its own UI, not a standard config file
- Don't offer Windsurf as a sync target for MCPs

### 5. Amp Support

#### Skills
- [ ] Scan `~/.config/agents/skills/<name>/SKILL.md` for user-level skills (shared convention)
- [ ] Scan `$PROJECT_ROOT/.agents/skills/<name>/SKILL.md` for project-level skills
- [ ] Same SKILL.md format as Claude/Codex/Gemini — reuse `parse_skill_md()`
- [ ] Note: Codex already scans `$HOME/.agents/skills/` — Amp shares this exact path

#### No standalone MCPs or Rules
- Amp manages MCPs/rules through its own system
- Only skills are file-based and scannable

### 6. Roo Code Support

#### Rules
- [ ] Scan `$PROJECT_ROOT/.roo/rules/*.md` for project-level rules
- [ ] Plain markdown format, one file per rule
- [ ] Mode-specific rules in `.roo/rules-{mode-slug}/*.md` (optional, for custom modes)
- [ ] No user-level rules (workspace-scoped only)

#### Skills
- [ ] Shares `.agents/skills/` convention with Amp and Codex
- [ ] Already scanned if Codex/Amp scanning is active — just add `roo` to `configuredIn`

#### Custom Modes (Read-Only Display)
- [ ] Scan `$PROJECT_ROOT/.roomodes` file (JSON format)
- [ ] Display custom modes as informational cards (name, slug, role definition)
- [ ] Read-only — don't offer sync for modes (they're Roo-specific)

### 7. Dynamic Filter UI

- [ ] `FilterBar` derives tool list from detected tools + tools present in scan results
- [ ] Tool color/label config expanded to cover all 8 tools
- [ ] `ToolBadge` supports all 8 tools with distinct colors
- [ ] Sync dialogs dynamically show only detected+applicable tools per feature
- [ ] Tool filter buttons wrap gracefully when there are many tools

---

## Technical Details

### SourceTool Enum Expansion

**Rust** (`src-tauri/src/scanners/mcps.rs` and other scanner files):
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum SourceTool {
    Claude,
    Codex,
    Gemini,
    Cursor,
    Copilot,
    Windsurf,
    Amp,
    Roo,
}
```

**TypeScript** (`src/types/index.ts`):
```typescript
export type SourceTool = "claude" | "codex" | "gemini" | "cursor" | "copilot" | "windsurf" | "amp" | "roo";
```

### Detection Command

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedTools {
    pub tools: Vec<SourceTool>,
}

#[tauri::command]
pub fn detect_installed_tools() -> Result<DetectedTools, String> {
    let home = dirs::home_dir().ok_or("No home directory")?;
    let mut tools = Vec::new();

    // Check config directories
    if home.join(".claude").is_dir() || home.join(".claude.json").is_file() {
        tools.push(SourceTool::Claude);
    }
    if home.join(".codex").is_dir() {
        tools.push(SourceTool::Codex);
    }
    if home.join(".gemini").is_dir() {
        tools.push(SourceTool::Gemini);
    }
    if home.join(".cursor").is_dir() {
        tools.push(SourceTool::Cursor);
    }
    if home.join(".windsurf").is_dir() {
        tools.push(SourceTool::Windsurf);
    }
    if home.join(".amp").is_dir() || home.join(".config/amp").is_dir() {
        tools.push(SourceTool::Amp);
    }

    // Copilot and Roo are project-level only — detected during workspace scan
    Ok(DetectedTools { tools })
}
```

### Cursor `.mdc` Rule Format

```
---
description: Rules for React components
globs: src/components/**/*.tsx
alwaysApply: false
---

# React Component Rules
Use functional components with hooks...
```

Parser: reuse `rules_frontmatter.rs` pattern — split on `---`, extract `description` and `globs`, treat rest as markdown body. Map `globs` to `scopedPaths`.

### Copilot Scoped Instructions Format

```markdown
---
applyTo: "**/*.test.ts"
---
Use Jest for testing. Always include edge cases...
```

Parser: same frontmatter pattern, map `applyTo` to `scopedPaths`.

### Config Paths Summary

#### MCPs

| Tool | Scope | Path | Format | Key |
|------|-------|------|--------|-----|
| Claude | User | `~/.claude.json` | JSON | `mcpServers` |
| Claude | Project | `$ROOT/.mcp.json` | JSON | `mcpServers` |
| Codex | User | `~/.codex/config.toml` | TOML | `mcp_servers` |
| Gemini | User | `~/.gemini/settings.json` | JSON | `mcpServers` |
| **Cursor** | **Project** | **`$ROOT/.cursor/mcp.json`** | **JSON** | **`mcpServers`** |

#### Rules / Prompts

| Tool | Scope | Path | Format |
|------|-------|------|--------|
| Claude | Global | `~/.claude/CLAUDE.md`, `~/.claude/rules/*.md` | Markdown |
| Claude | Project | `CLAUDE.md`, `.claude/rules/*.md` | Markdown (w/ optional frontmatter) |
| Codex | Global | `~/.codex/AGENTS.md` | Markdown |
| Codex | Project | `AGENTS.md`, `.codex/AGENTS.md`, `**/AGENTS.md` | Markdown |
| Gemini | Global | `~/.gemini/GEMINI.md` | Markdown |
| Gemini | Project | `GEMINI.md`, `.gemini/rules/*.md`, `**/GEMINI.md` | Markdown |
| **Cursor** | **Project** | **`$ROOT/.cursor/rules/*.mdc`** | **MDC (Markdown + header)** |
| **Copilot** | **Project** | **`$ROOT/.github/copilot-instructions.md`** | **Markdown** |
| **Copilot** | **Project** | **`$ROOT/.github/instructions/**/*.instructions.md`** | **Markdown (w/ frontmatter)** |
| **Windsurf** | **Project** | **`$ROOT/.windsurf/rules/*.md`** | **Markdown** |
| **Roo** | **Project** | **`$ROOT/.roo/rules/*.md`** | **Markdown** |

#### Skills

| Tool | Scope | Path |
|------|-------|------|
| Claude | User | `~/.claude/skills/<name>/SKILL.md` |
| Claude | Project | `$ROOT/.claude/skills/<name>/SKILL.md` |
| Codex | User | `~/.agents/skills/<name>/SKILL.md` |
| Codex | Project | `$ROOT/.codex/skills/<name>/SKILL.md` |
| Gemini | User | `~/.gemini/skills/<name>/SKILL.md` |
| Gemini | Project | `$ROOT/.gemini/skills/<name>/SKILL.md` |
| **Amp** | **User** | **`~/.config/agents/skills/<name>/SKILL.md`** |
| **Amp** | **Project** | **`$ROOT/.agents/skills/<name>/SKILL.md`** |
| **Roo** | **Project** | **`$ROOT/.agents/skills/<name>/SKILL.md`** (shared with Amp/Codex) |

### Tool UI Config

```typescript
const allToolConfig: Record<SourceTool, { label: string; activeClass: string }> = {
  claude:   { label: "Claude",   activeClass: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  codex:    { label: "Codex",    activeClass: "bg-green-500/15 text-green-600 border-green-500/30" },
  gemini:   { label: "Gemini",   activeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  cursor:   { label: "Cursor",   activeClass: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  copilot:  { label: "Copilot",  activeClass: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  windsurf: { label: "Windsurf", activeClass: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" },
  amp:      { label: "Amp",      activeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  roo:      { label: "Roo",      activeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
};
```

### Feature Support Matrix

Determines which tools appear in sync dialogs per feature:

| Feature | Claude | Codex | Gemini | Cursor | Copilot | Windsurf | Amp | Roo |
|---------|--------|-------|--------|--------|---------|----------|-----|-----|
| MCPs | Write | Write | Write | Write | — | — | — | — |
| Rules | Write | Write | Write | Write | Write | Write | — | Write |
| Skills | Write | Write | Write | — | — | — | Write | Write* |
| Hooks | Read | — | Read | — | — | — | — | — |

*Roo shares `.agents/skills/` path with Amp and Codex — writing to one makes it available to all three.

### Maturity by Tool

| Tool | Maturity | Notes |
|------|----------|-------|
| Claude Code | Stable | Production, well-documented |
| Codex CLI | Stable | Production |
| Gemini CLI | Experimental | Features behind experiment flags |
| Cursor | Stable | Production, large user base |
| GitHub Copilot | Stable | Instructions system is GA |
| Windsurf | Stable | Rules system is GA |
| Amp | Experimental | Newer tool, conventions still evolving |
| Roo Code | Experimental | Fork of Cline, still maturing |

### WorkspaceSignals Expansion

```rust
pub struct WorkspaceSignals {
    // Existing
    pub has_claude_config: bool,
    pub has_codex_config: bool,
    pub has_gemini_config: bool,
    pub has_mcp_json: bool,
    pub has_claude_prompt: bool,
    pub has_codex_prompt: bool,
    pub has_gemini_prompt: bool,
    pub has_claude_skills: bool,
    pub has_codex_skills: bool,
    pub has_gemini_skills: bool,
    // New
    pub has_cursor_config: bool,    // .cursor/ dir
    pub has_copilot_config: bool,   // .github/copilot-instructions.md or .github/instructions/
    pub has_windsurf_config: bool,  // .windsurf/ dir
    pub has_roo_config: bool,       // .roo/ dir
    pub has_agents_dir: bool,       // .agents/ dir (Amp + Roo + Codex shared)
}
```

### Rust Crates

No new crates needed. All formats are already handled:
- `serde_json` — JSON configs (Cursor MCPs, Roo modes)
- `serde_yaml` — YAML frontmatter in markdown (already used for skills)
- `walkdir` — directory traversal
- `toml_edit` — TOML (Codex, existing)

### Files to Create

```
src-tauri/src/
├── commands/detection.rs       # detect_installed_tools command
├── parsers/mdc_rules.rs        # Cursor .mdc rule parser (frontmatter + markdown)
├── parsers/copilot_rules.rs    # Copilot instructions parser (applyTo frontmatter)

src/
├── lib/api/detection.ts        # detectInstalledTools() wrapper
```

### Files to Modify

```
src-tauri/src/
├── commands/mod.rs             # Add pub use detection::*
├── parsers/mod.rs              # Add pub use mdc_rules::*, copilot_rules::*
├── scanners/mcps.rs            # Add Cursor MCP scanning + SourceTool variants
├── scanners/skills.rs          # Add Amp skill paths + SourceTool variants
├── scanners/prompts.rs         # Add Cursor/Copilot/Windsurf/Roo rule scanning
├── scanners/workspaces.rs      # Add new workspace signals
├── lib.rs                      # Register detect_installed_tools command

src/
├── types/index.ts              # Expand SourceTool, WorkspaceSignals
├── components/filters/FilterBar.tsx  # Dynamic tool list from detection
├── components/mcps/ToolBadge.tsx     # Add colors for 5 new tools
├── components/sync/*.tsx             # Feature-aware tool selectors
├── App.tsx                           # Wire detection query
```

---

## Implementation Order

1. **Auto-detection** — `detect_installed_tools` command + frontend wiring. This also makes the existing 3 tools dynamic (only show Claude/Codex/Gemini if installed).
2. **Cursor** — Biggest impact. MCPs + rules.
3. **Copilot** — Trivial. Just markdown instruction files.
4. **Windsurf** — Trivial. Just markdown rule files.
5. **Amp + Roo** — Together, since they share `.agents/skills/`. Rules for Roo.

Steps 2-5 are independent per-scanner changes and could be parallelized.

---

## Test Plan

### Auto-Detection
1. On a machine with Claude + Cursor installed → only Claude and Cursor appear as filter buttons
2. On a machine with all tools → all 8 appear
3. Open a workspace with `.github/copilot-instructions.md` → Copilot filter appears (even though Copilot isn't user-level detected)
4. Scan results that include items from a non-detected tool → that tool still appears in filters

### Cursor MCPs
5. Create `$PROJECT_ROOT/.cursor/mcp.json` with a `mcpServers` entry
6. Scan → MCP appears with `sourceTool: "cursor"` and `scope: "project"`
7. MCP with same name in Claude + Cursor → merged into single entry with `configuredIn: ["claude", "cursor"]`

### Cursor Rules
8. Create `$PROJECT_ROOT/.cursor/rules/react.mdc` with description + globs header
9. Scan → rule appears with `sourceTool: "cursor"`, `scopedPaths` populated from globs
10. Rule with no header (plain markdown) → parsed successfully, `isScoped: false`

### Copilot Instructions
11. Create `$PROJECT_ROOT/.github/copilot-instructions.md`
12. Scan → shows as rule with `sourceTool: "copilot"`, `scope: "project"`
13. Create `$PROJECT_ROOT/.github/instructions/tests.instructions.md` with `applyTo: "**/*.test.ts"` frontmatter
14. Scan → shows as scoped rule with `scopedPaths: ["**/*.test.ts"]`

### Windsurf Rules
15. Create `$PROJECT_ROOT/.windsurf/rules/coding-style.md`
16. Scan → shows as rule with `sourceTool: "windsurf"`, `scope: "project"`

### Amp Skills
17. Create `~/.config/agents/skills/my-skill/SKILL.md`
18. Scan → skill appears with `sourceTool: "amp"`, `scope: "user"`
19. Same skill name exists in `~/.claude/skills/` → merged into `configuredIn: ["claude", "amp"]`

### Roo Rules
20. Create `$PROJECT_ROOT/.roo/rules/testing.md`
21. Scan → shows as rule with `sourceTool: "roo"`, `scope: "project"`

### Roo + Amp + Codex Shared Skills Path
22. Create `$PROJECT_ROOT/.agents/skills/shared-skill/SKILL.md`
23. Scan → skill shows `configuredIn` including all detected tools that use this path

### Dynamic Filters
24. FilterBar shows only detected tools as buttons
25. Adding an MCP → sync dialog only offers Claude, Codex, Gemini, Cursor (tools that support MCPs)
26. Syncing a rule → dialog offers all tools that support rules (excludes Amp)

### Sync Writes
27. Sync MCP to Cursor → writes to `$PROJECT_ROOT/.cursor/mcp.json`
28. Sync rule to Copilot → writes to `$PROJECT_ROOT/.github/copilot-instructions.md`
29. Install skill to Amp → writes to `~/.config/agents/skills/<name>/SKILL.md`

### Edge Cases
30. `.cursor/rules/` directory doesn't exist → no Cursor rules found, no error
31. `.mdc` file with malformed header → falls back to plain markdown parsing
32. Workspace with no AI tool configs → empty state shows guidance
33. Tool detected via CLI but no config files yet → tool appears in sync targets

---

## Dependencies

- Issue 1: App Bootstrap (workspace selection)
- Issue 5: Sync infrastructure (atomic writes, backups)

---

## Notes

- **Shared `.agents/skills/`**: Codex, Amp, and Roo all use `$PROJECT_ROOT/.agents/skills/`. A skill written here is available to all three. The scanner should attribute it to all detected tools that share this path, rather than picking one. This is a unique case of "write once, available to multiple tools" that's even simpler than our sync feature.
- **Cursor `.mdc` vs `.md`**: Cursor uses the `.mdc` extension for rules. The content is markdown with an optional header block. Our glob patterns need to include `*.mdc` when scanning Cursor rules.
- **Copilot is read-heavy**: Most users won't sync *to* Copilot (they'll sync *from* it). The Copilot instructions format is simpler than other tools' rule systems, so syncing a complex Claude rule to Copilot may lose scoping nuance.
- **Windsurf MCP gap**: Windsurf supports MCPs but manages them through its own UI/settings, not a standard config file we can scan. If Windsurf later exposes a file-based MCP config, we can add scanning.
- **No YAML parser needed**: All 5 tools use JSON or Markdown. The `.mdc` and Copilot frontmatter formats use the same `---` delimited YAML frontmatter that `serde_yaml` already parses (via `skill_md.rs` / `rules_frontmatter.rs`). No new crate dependencies.
- **Continue.dev deferred**: Continue.dev uses YAML as its primary config format (`config.yaml`), which would be the first tool requiring a full YAML root document parser (as opposed to YAML frontmatter embedded in markdown, which we already handle). This is a separate issue.
