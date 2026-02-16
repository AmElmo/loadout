# Issue 12: Expand Tool Support — Cursor, Copilot, Windsurf, Amp, Roo Code, Cline, Kilo Code, OpenCode, Trae

**Phase:** 3 (Ecosystem Expansion)
**Status:** Pending

---

## Summary

Add support for 9 additional AI coding tools and introduce automatic tool detection so the UI only shows tools the user actually has installed. These 9 tools were selected because they require no new config parsers (all JSON or Markdown — no YAML), reuse existing scanner patterns, and cover the most popular tools in the ecosystem.

### Why These 9

| Tool | Users / Popularity | Why Easy |
|------|-------------------|----------|
| **Cursor** | ~1M+ users, dominant AI editor | MCP uses same JSON shape as Claude; rules are markdown with frontmatter (like Claude scoped rules) |
| **GitHub Copilot** | 20M+ users, 42% market share | MCPs via JSON `mcpServers`; rules as markdown in `.github/`; skills in `.github/skills/` |
| **Windsurf** | Leading free AI editor | MCPs via `~/.codeium/windsurf/mcp_config.json`; plain markdown rules in `.windsurf/rules/` |
| **Amp** | Sourcegraph's agentic tool | Uses `.agents/skills/` — same path convention Codex already uses |
| **Roo Code** | Growing VS Code extension | Markdown rules in `.roo/rules/`; skills in `.roo/skills/` (own path, not shared) |
| **Cline** | ~30K GitHub stars, popular VS Code agent | Rules as `.clinerules` markdown; skills in `.cline/skills/` (SKILL.md). Parent of Roo/Kilo forks |
| **Kilo Code** | ~10K+ GitHub stars, Cline fork | Same patterns as Cline with `.kilocode/` paths. Near-zero marginal cost once Cline is supported |
| **OpenCode** | ~100K+ GitHub stars, fast-growing CLI | Uses `AGENTS.md` (same as Codex); universal `.agents/skills/`; JSON `mcpServers` for MCPs |
| **Trae** | ~6M registered (ByteDance IDE) | JSON MCPs in `.trae/mcp.json`; markdown rules in `.trae/rules/`; skills in `.trae/skills/` |

### What We're NOT Adding (Yet)

**Continue.dev** is deferred to a separate issue because it uses YAML config for MCPs (`.continue/mcpServers/*.yaml`) and `config.yaml` for main settings. Rules (`.continue/rules/`) and skills could be added without the YAML blocker, but bundling them separately keeps this issue focused.

**Junie** (JetBrains), **Kiro** (AWS), and **Goose** (Block) are deferred as a fast follow-up — they're popular but have more unique config patterns (Kiro's "steering" files, Goose's YAML-based extensions, Junie's guidelines format).

---

## Acceptance Criteria

### 1. Auto-Detection of Installed Tools

> This is a prerequisite for the rest. With 12 tools total, showing all of them as filters would be noisy. Only show what's relevant.

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
| Copilot | `~/.copilot/skills/` dir exists | N/A (VS Code extension) |
| Windsurf | `~/.codeium/windsurf/` dir or `~/.windsurf/` dir exists | `which windsurf` |
| Amp | `~/.amp/` or `~/.config/amp/` dir exists | `which amp` |
| Roo Code | N/A (VS Code extension) | N/A |
| Cline | N/A (VS Code extension) | N/A |
| Kilo Code | N/A (VS Code extension) | N/A |
| OpenCode | `~/.config/opencode/` dir exists | `which opencode` |
| Trae | `~/.trae/` dir exists | `which trae` |

**Special cases:**
- **Copilot**: Detected when a workspace has `.github/copilot-instructions.md`, `.github/instructions/`, or `.github/skills/` — or user-level via `~/.copilot/skills/`
- **Roo Code**: Detected when a workspace has `.roo/` directory — it's project-level only (user-level at `~/.roo/skills/`)
- **Cline**: Detected when a workspace has `.cline/` directory or `.clinerules` file
- **Kilo Code**: Detected when a workspace has `.kilocode/` directory
- All should also appear if their items show up in any scan results

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

#### MCPs
- [ ] Copilot coding agent supports MCP servers via JSON config with `mcpServers` key
- [ ] Scan `$PROJECT_ROOT/.vscode/mcp.json` for project-level MCPs (shared VS Code / Copilot config)
- [ ] Reuse `parse_claude_config()` — same JSON `mcpServers` shape
- [ ] Note: Copilot coding agent also accepts repo-level MCP config via GitHub.com settings (not file-scannable)

#### Skills
- [ ] Scan `$PROJECT_ROOT/.github/skills/<name>/SKILL.md` for project-level skills
- [ ] Scan `$PROJECT_ROOT/.claude/skills/<name>/SKILL.md` for project-level skills (Copilot reads Claude's skill path too)
- [ ] Scan `~/.copilot/skills/<name>/SKILL.md` for user-level skills
- [ ] Same SKILL.md format — reuse `parse_skill_md()`

#### No Hooks
- Copilot does not support hooks

### 4. Windsurf Support

#### Rules
- [ ] Scan `$PROJECT_ROOT/.windsurf/rules/*.md` for project-level rules
- [ ] Plain markdown format (no special frontmatter needed)
- [ ] Windsurf rules can be: always-on, `@mentionable`, or glob-matched
- [ ] Map glob-matched rules to `scopedPaths` on `PromptFile`
- [ ] No user-level rules path documented

#### MCPs
- [ ] Scan `~/.codeium/windsurf/mcp_config.json` for user-level MCPs
- [ ] JSON format uses `mcpServers` key (same shape as Claude)
- [ ] Reuse `parse_claude_config()` — identical JSON structure
- [ ] Supports both stdio and HTTP MCP types, plus environment variable interpolation
- [ ] Note: Windsurf also exposes this config via its UI (MCP icon → Configure), but the underlying file is scannable

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
- [ ] Scan `$PROJECT_ROOT/.roo/skills/<name>/SKILL.md` for project-level skills
- [ ] Scan `~/.roo/skills/<name>/SKILL.md` for user-level skills
- [ ] Mode-specific skills in `.roo/skills-{mode-slug}/<name>/SKILL.md` (optional)
- [ ] Same SKILL.md format — reuse `parse_skill_md()`
- [ ] Note: Roo uses its own `.roo/skills/` path, NOT the shared `.agents/skills/` convention

#### Custom Modes (Read-Only Display)
- [ ] Scan `$PROJECT_ROOT/.roomodes` file (JSON format)
- [ ] Display custom modes as informational cards (name, slug, role definition)
- [ ] Read-only — don't offer sync for modes (they're Roo-specific)

### 7. Cline Support

#### Rules
- [ ] Scan `$PROJECT_ROOT/.clinerules` as a single rules file (plain markdown)
- [ ] Scan `$PROJECT_ROOT/.clinerules/*.md` for multiple rule files (if directory exists)
- [ ] Plain markdown format, no special frontmatter

#### Skills
- [ ] Scan `$PROJECT_ROOT/.cline/skills/<name>/SKILL.md` for project-level skills
- [ ] Same SKILL.md format — reuse `parse_skill_md()`

#### No file-based MCPs
- Cline stores MCP config in VS Code extension storage (`cline_mcp_settings.json`), not in a standard project-level file
- Don't offer Cline as an MCP sync target

### 8. Kilo Code Support

#### Rules
- [ ] Scan Kilo Code rules in same format as Cline (`.kilocode/` equivalent paths)
- [ ] Kilo Code is a Cline fork — same markdown rule patterns apply

#### Skills
- [ ] Scan `$PROJECT_ROOT/.kilocode/skills/<name>/SKILL.md` for project-level skills
- [ ] Same SKILL.md format — reuse `parse_skill_md()`

#### No file-based MCPs
- Kilo Code stores MCP config in VS Code extension storage (like Cline)
- Don't offer Kilo Code as an MCP sync target

### 9. OpenCode Support

#### MCPs
- [ ] Scan OpenCode MCP config for JSON `mcpServers` entries
- [ ] Reuse `parse_claude_config()` — same JSON shape

#### Rules
- [ ] Scan `$PROJECT_ROOT/AGENTS.md` — same file as Codex (shared convention)
- [ ] Scan `$PROJECT_ROOT/.opencode/rules/*.md` for project-level rules
- [ ] Plain markdown format

#### Skills
- [ ] OpenCode uses `.agents/skills/` (universal convention) — already scanned for Amp/Codex
- [ ] Add `opencode` to `configuredIn` for items found at `.agents/skills/`

#### Subagents (Read-Only)
- [ ] Scan `$PROJECT_ROOT/.opencode/agents/*.md` for custom agent definitions (informational display)

### 10. Trae Support

#### MCPs
- [ ] Scan `$PROJECT_ROOT/.trae/mcp.json` for project-level MCPs
- [ ] JSON format uses `mcpServers` key (same shape as Claude)
- [ ] Reuse `parse_claude_config()` — identical JSON structure

#### Rules
- [ ] Scan `$PROJECT_ROOT/.trae/rules/*.md` for project-level rules
- [ ] Plain markdown format

#### Skills
- [ ] Scan `$PROJECT_ROOT/.trae/skills/<name>/SKILL.md` for project-level skills
- [ ] Same SKILL.md format — reuse `parse_skill_md()`

### 11. Dynamic Filter UI

- [ ] `FilterBar` derives tool list from detected tools + tools present in scan results
- [ ] Tool color/label config expanded to cover all 12 tools
- [ ] `ToolBadge` supports all 12 tools with distinct colors
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
    Cline,
    Kilo,
    OpenCode,
    Trae,
}
```

**TypeScript** (`src/types/index.ts`):
```typescript
export type SourceTool = "claude" | "codex" | "gemini" | "cursor" | "copilot" | "windsurf" | "amp" | "roo" | "cline" | "kilo" | "opencode" | "trae";
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
    if home.join(".codeium/windsurf").is_dir() || home.join(".windsurf").is_dir() {
        tools.push(SourceTool::Windsurf);
    }
    if home.join(".amp").is_dir() || home.join(".config/amp").is_dir() {
        tools.push(SourceTool::Amp);
    }
    if home.join(".copilot/skills").is_dir() {
        tools.push(SourceTool::Copilot);
    }
    if home.join(".config/opencode").is_dir() {
        tools.push(SourceTool::OpenCode);
    }
    if home.join(".trae").is_dir() {
        tools.push(SourceTool::Trae);
    }

    // Copilot, Roo, Cline, Kilo also detected during workspace scan via project-level config
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
| **Copilot** | **Project** | **`$ROOT/.vscode/mcp.json`** | **JSON** | **`mcpServers`** |
| **Windsurf** | **User** | **`~/.codeium/windsurf/mcp_config.json`** | **JSON** | **`mcpServers`** |
| **Trae** | **Project** | **`$ROOT/.trae/mcp.json`** | **JSON** | **`mcpServers`** |
| **OpenCode** | **User** | **`~/.config/opencode/config.json`** | **JSON** | **`mcpServers`** |

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
| **Cline** | **Project** | **`$ROOT/.clinerules` or `$ROOT/.clinerules/*.md`** | **Markdown** |
| **Kilo** | **Project** | **`$ROOT/.kilocode/rules/*.md`** | **Markdown** |
| **OpenCode** | **Project** | **`$ROOT/AGENTS.md` (shared w/ Codex), `$ROOT/.opencode/rules/*.md`** | **Markdown** |
| **Trae** | **Project** | **`$ROOT/.trae/rules/*.md`** | **Markdown** |

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
| **Copilot** | **User** | **`~/.copilot/skills/<name>/SKILL.md`** |
| **Copilot** | **Project** | **`$ROOT/.github/skills/<name>/SKILL.md`** |
| **Roo** | **User** | **`~/.roo/skills/<name>/SKILL.md`** |
| **Roo** | **Project** | **`$ROOT/.roo/skills/<name>/SKILL.md`** |
| **Cline** | **Project** | **`$ROOT/.cline/skills/<name>/SKILL.md`** |
| **Kilo** | **Project** | **`$ROOT/.kilocode/skills/<name>/SKILL.md`** |
| **OpenCode** | **Project** | **`$ROOT/.agents/skills/<name>/SKILL.md`** (shared with Amp/Codex) |
| **Trae** | **Project** | **`$ROOT/.trae/skills/<name>/SKILL.md`** |

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
  cline:    { label: "Cline",    activeClass: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  kilo:     { label: "Kilo",     activeClass: "bg-lime-500/15 text-lime-600 border-lime-500/30" },
  opencode: { label: "OpenCode", activeClass: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30" },
  trae:     { label: "Trae",     activeClass: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30" },
};
```

### Feature Support Matrix

Determines which tools appear in sync dialogs per feature:

| Feature | Claude | Codex | Gemini | Cursor | Copilot | Windsurf | Amp | Roo | Cline | Kilo | OpenCode | Trae |
|---------|--------|-------|--------|--------|---------|----------|-----|-----|-------|------|----------|------|
| MCPs | Write | Write | Write | Write | Write | Write | — | — | — | — | Write | Write |
| Rules | Write | Write | Write | Write | Write | Write | — | Write | Write | Write | Write | Write |
| Skills | Write | Write | Write | — | Write | — | Write | Write | Write | Write | Write* | Write |
| Hooks | Read | — | Read | — | — | — | — | — | — | — | — | — |

Notes:
- Copilot MCPs: via `$ROOT/.vscode/mcp.json` (project-level only)
- Copilot Skills: via `$ROOT/.github/skills/` (project) and `~/.copilot/skills/` (user)
- Windsurf MCPs: via `~/.codeium/windsurf/mcp_config.json` (user-level only)
- Roo Skills: via `.roo/skills/` (own path, not shared with Amp/Codex)
- Cline/Kilo MCPs: stored in VS Code extension storage, not scannable project files
- OpenCode Skills*: uses `.agents/skills/` (shared with Amp/Codex) — writing to one makes it available to all three
- Trae MCPs: via `$ROOT/.trae/mcp.json` (project-level)

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
| Cline | Stable | ~30K GitHub stars, popular VS Code agent |
| Kilo Code | Experimental | Fork of Cline, ~10K+ GitHub stars |
| OpenCode | Stable | ~100K+ GitHub stars, fast-growing CLI |
| Trae | Stable | ByteDance IDE, large user base in Asia |

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
    pub has_copilot_skills: bool,   // .github/skills/ dir
    pub has_roo_skills: bool,       // .roo/skills/ dir
    pub has_cline_config: bool,     // .cline/ dir or .clinerules file
    pub has_kilo_config: bool,      // .kilocode/ dir
    pub has_opencode_config: bool,  // .opencode/ dir
    pub has_trae_config: bool,      // .trae/ dir
    pub has_agents_dir: bool,       // .agents/ dir (Amp + Codex + OpenCode shared)
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
├── scanners/mcps.rs            # Add Cursor/Copilot/Windsurf/Trae/OpenCode MCP scanning + SourceTool variants
├── scanners/skills.rs          # Add Amp/Copilot/Roo/Cline/Kilo/Trae skill paths + SourceTool variants
├── scanners/prompts.rs         # Add Cursor/Copilot/Windsurf/Roo/Cline/Kilo/OpenCode/Trae rule scanning
├── scanners/workspaces.rs      # Add new workspace signals
├── lib.rs                      # Register detect_installed_tools command

src/
├── types/index.ts              # Expand SourceTool, WorkspaceSignals
├── components/filters/FilterBar.tsx  # Dynamic tool list from detection
├── components/mcps/ToolBadge.tsx     # Add colors for 9 new tools
├── components/sync/*.tsx             # Feature-aware tool selectors
├── App.tsx                           # Wire detection query
```

---

## Implementation Order

1. **Auto-detection** — `detect_installed_tools` command + frontend wiring. This also makes the existing 3 tools dynamic (only show Claude/Codex/Gemini if installed).
2. **Cursor** — Biggest impact. MCPs + rules.
3. **Copilot** — MCPs (`.vscode/mcp.json`), rules (instructions), and skills (`.github/skills/`, `~/.copilot/skills/`).
4. **Windsurf** — MCPs (`~/.codeium/windsurf/mcp_config.json`) + markdown rule files.
5. **Amp** — Skills only (`.agents/skills/` shared with Codex).
6. **Roo** — Rules (`.roo/rules/`) + skills (`.roo/skills/`, own path) + custom modes.
7. **Cline + Kilo Code** — Together, since Kilo is a Cline fork with identical patterns. Rules + skills.
8. **OpenCode** — MCPs + rules (`AGENTS.md` shared with Codex) + skills (`.agents/skills/` shared with Amp/Codex).
9. **Trae** — MCPs (`.trae/mcp.json`) + rules (`.trae/rules/`) + skills (`.trae/skills/`).

Steps 2-9 are independent per-scanner changes and could be parallelized.

---

## Test Plan

### Auto-Detection
1. On a machine with Claude + Cursor installed → only Claude and Cursor appear as filter buttons
2. On a machine with all tools → all 12 appear
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

### Roo Skills
22. Create `$PROJECT_ROOT/.roo/skills/my-skill/SKILL.md`
23. Scan → skill appears with `sourceTool: "roo"`, `scope: "project"`

### Copilot MCPs
24a. Create `$PROJECT_ROOT/.vscode/mcp.json` with a `mcpServers` entry
24b. Scan → MCP appears with `sourceTool: "copilot"` and `scope: "project"`

### Windsurf MCPs
24c. Verify `~/.codeium/windsurf/mcp_config.json` with a `mcpServers` entry
24d. Scan → MCP appears with `sourceTool: "windsurf"` and `scope: "user"`

### Copilot Skills
24e. Create `$PROJECT_ROOT/.github/skills/my-skill/SKILL.md`
24f. Scan → skill appears with `sourceTool: "copilot"`, `scope: "project"`

### Amp + Codex Shared Skills Path
25a. Create `$PROJECT_ROOT/.agents/skills/shared-skill/SKILL.md`
25b. Scan → skill shows `configuredIn` including Amp and Codex (not Roo — Roo has its own path)

### Cline Rules
26a. Create `$PROJECT_ROOT/.clinerules` with markdown content
26b. Scan → shows as rule with `sourceTool: "cline"`, `scope: "project"`
26c. Create `$PROJECT_ROOT/.clinerules/testing.md`
26d. Scan → shows as rule with `sourceTool: "cline"`, `scope: "project"`

### Cline Skills
26e. Create `$PROJECT_ROOT/.cline/skills/my-skill/SKILL.md`
26f. Scan → skill appears with `sourceTool: "cline"`, `scope: "project"`

### Kilo Code Rules + Skills
26g. Create `$PROJECT_ROOT/.kilocode/rules/style.md`
26h. Scan → shows as rule with `sourceTool: "kilo"`, `scope: "project"`
26i. Create `$PROJECT_ROOT/.kilocode/skills/my-skill/SKILL.md`
26j. Scan → skill appears with `sourceTool: "kilo"`, `scope: "project"`

### OpenCode MCPs
26k. Create OpenCode MCP config with `mcpServers` entry
26l. Scan → MCP appears with `sourceTool: "opencode"`

### OpenCode Rules
26m. `$PROJECT_ROOT/AGENTS.md` scanned → shows for both Codex and OpenCode in `configuredIn`
26n. Create `$PROJECT_ROOT/.opencode/rules/style.md`
26o. Scan → shows as rule with `sourceTool: "opencode"`, `scope: "project"`

### Trae MCPs
26p. Create `$PROJECT_ROOT/.trae/mcp.json` with a `mcpServers` entry
26q. Scan → MCP appears with `sourceTool: "trae"` and `scope: "project"`

### Trae Rules + Skills
26r. Create `$PROJECT_ROOT/.trae/rules/coding-style.md`
26s. Scan → shows as rule with `sourceTool: "trae"`, `scope: "project"`
26t. Create `$PROJECT_ROOT/.trae/skills/my-skill/SKILL.md`
26u. Scan → skill appears with `sourceTool: "trae"`, `scope: "project"`

### Dynamic Filters
27. FilterBar shows only detected tools as buttons
28. Adding an MCP → sync dialog offers Claude, Codex, Gemini, Cursor, Copilot, Windsurf, OpenCode, Trae (tools that support MCPs)
29. Syncing a rule → dialog offers all tools that support rules (excludes Amp)

### Sync Writes
30. Sync MCP to Cursor → writes to `$PROJECT_ROOT/.cursor/mcp.json`
31. Sync MCP to Copilot → writes to `$PROJECT_ROOT/.vscode/mcp.json`
32. Sync MCP to Windsurf → writes to `~/.codeium/windsurf/mcp_config.json`
33. Sync MCP to Trae → writes to `$PROJECT_ROOT/.trae/mcp.json`
34. Sync rule to Copilot → writes to `$PROJECT_ROOT/.github/copilot-instructions.md`
35. Install skill to Amp → writes to `~/.config/agents/skills/<name>/SKILL.md`
36. Install skill to Roo → writes to `$PROJECT_ROOT/.roo/skills/<name>/SKILL.md`
37. Install skill to Copilot → writes to `$PROJECT_ROOT/.github/skills/<name>/SKILL.md`
38. Install skill to Cline → writes to `$PROJECT_ROOT/.cline/skills/<name>/SKILL.md`
39. Install skill to Kilo → writes to `$PROJECT_ROOT/.kilocode/skills/<name>/SKILL.md`
40. Install skill to Trae → writes to `$PROJECT_ROOT/.trae/skills/<name>/SKILL.md`

### Edge Cases
41. `.cursor/rules/` directory doesn't exist → no Cursor rules found, no error
42. `.mdc` file with malformed header → falls back to plain markdown parsing
43. Workspace with no AI tool configs → empty state shows guidance
44. Tool detected via CLI but no config files yet → tool appears in sync targets
45. `.clinerules` exists as file (not directory) → parsed as single rule, no error
46. `.clinerules/` exists as directory → scan `*.md` files inside

---

## Dependencies

- Issue 1: App Bootstrap (workspace selection)
- Issue 5: Sync infrastructure (atomic writes, backups)

---

## Notes

- **Shared `.agents/skills/`**: Codex, Amp, and OpenCode all use `$PROJECT_ROOT/.agents/skills/`. A skill written here is available to all three. Roo uses its own `.roo/skills/` path (verified via [Roo docs](https://docs.roocode.com/features/skills)). The scanner should attribute `.agents/skills/` items to Codex, Amp, and OpenCode — not Roo.
- **Cursor `.mdc` vs `.md`**: Cursor uses the `.mdc` extension for rules. The content is markdown with an optional header block. Our glob patterns need to include `*.mdc` when scanning Cursor rules.
- **Copilot is broader than initially thought**: Copilot now supports MCPs (via `.vscode/mcp.json` and repo-level GitHub settings), skills (`.github/skills/`, `~/.copilot/skills/`), and instructions. Verified via [GitHub docs](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/extending-copilot-coding-agent-with-mcp). Copilot also reads from `.claude/skills/` and `~/.claude/skills/` — skills written for Claude are automatically available to Copilot.
- **Windsurf MCP is file-based**: Windsurf stores MCP config at `~/.codeium/windsurf/mcp_config.json` (macOS/Linux) using JSON with `mcpServers` key. Verified via [Windsurf docs](https://docs.windsurf.com/windsurf/cascade/mcp). The Windsurf UI edits this same file, so we can both scan and write to it.
- **No YAML parser needed**: All 9 tools use JSON or Markdown. The `.mdc` and Copilot frontmatter formats use the same `---` delimited YAML frontmatter that `serde_yaml` already parses (via `skill_md.rs` / `rules_frontmatter.rs`). No new crate dependencies.
- **Cline/Kilo/Roo family**: Kilo Code and Roo Code are both forks of Cline. They share similar config patterns but use distinct directory paths (`.cline/`, `.kilocode/`, `.roo/`). Supporting one makes the others near-zero marginal cost.
- **Cline/Kilo MCPs are not file-scannable**: Unlike other tools, Cline and Kilo Code store MCP config in VS Code extension storage (`cline_mcp_settings.json` in globalStorage), not in a standard project-level file. We only support rules and skills for these tools.
- **OpenCode shares conventions**: OpenCode uses `AGENTS.md` (same as Codex) and `.agents/skills/` (same as Amp/Codex). Adding OpenCode mostly means adding a new `SourceTool` variant and attributing shared-path items to it.
- **Trae config is standard**: Trae uses `.trae/mcp.json` (JSON `mcpServers`), `.trae/rules/*.md`, and `.trae/skills/` — all patterns we already handle. Straightforward addition.
- **Continue.dev deferred**: Continue.dev uses YAML for MCP configs (`.continue/mcpServers/*.yaml`) and `config.yaml` for main settings. It also supports JSON MCP configs. Rules are markdown (`.continue/rules/`). Adding Continue is a separate issue — the YAML MCP format is the main blocker, though rules and skills could be added without it.
