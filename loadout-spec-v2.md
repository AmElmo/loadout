# Loadout: Unified AI CLI Configuration Management Tool

## Product Specification v2.1

**Date:** February 5, 2026
**Author:** Julien Berthomier
**Target Users:** Vibe coders using multiple AI coding CLIs

---

## Executive Summary

Loadout is a unified configuration management dashboard for AI coding CLIs (Claude Code, Codex CLI, Gemini CLI). It provides a single interface to view, manage, and sync configurations across all three tools, eliminating the need to manually edit JSON, TOML, and various markdown files scattered across different locations.

**One-liner for users:**
"Manage your skills, MCPs, hooks, plugins, commands, agents, prompts, and settings across Claude Code, Codex, and Gemini CLI — from one place. Add an MCP once → it's available everywhere. Install a skill once → it's available across all supported tools."

---

## Problem Statement

Vibe coders using multiple AI coding assistants face:

1. **Configuration Fragmentation**: Settings spread across `~/.claude/`, `~/.codex/`, `~/.gemini/`, and `.agents/` with different formats (JSON, TOML, Markdown)
2. **No Unified View**: No way to see "what's configured where" at a glance
3. **Manual Sync Required**: Adding an MCP server to all tools requires editing 3 different files in 3 different formats
4. **Feature Discovery**: Hard to know what capabilities exist across tools and which are stable vs experimental
5. **No Conflict Detection**: Different tools may have conflicting configurations
6. **Path Churn**: Docs and paths evolve rapidly; a tool that validates against reality (not just docs) prevents breakage

---

## Non-Goals (v1)

Loadout is a configuration visibility and management tool. It is explicitly **not**:

- **A CLI replacement.** Loadout does not run Claude Code, Codex, or Gemini CLI. It shows you what's configured and helps you manage it.
- **A behavioral abstraction layer.** Loadout does not attempt to make the three CLIs behave identically. Skills may invoke differently, hooks may fire at different points, and permissions work differently across tools. Loadout surfaces these differences; it does not hide them.
- **A secrets manager.** Loadout will display where API keys and tokens are referenced in config files, but it does not store, rotate, or manage secrets. Users remain responsible for their own credential management.
- **A runtime monitor.** Loadout reads config files on disk. It does not intercept CLI sessions, monitor token usage, or track live agent behavior.
- **A guaranteed cross-tool compatibility layer.** "Install to all tools" means Loadout writes files to the correct paths. It does not guarantee identical runtime behavior — tools with experimental features (e.g., Gemini skills) may not activate even with correct config.

---

## Changelog

### v2.0 → v2.1

| Item | v2.0 | v2.1 | Source |
|------|------|------|--------|
| One-liner | "Install once → it works in all three" | "Install once → available across all supported tools" | Reviewer: overpromises given Gemini experimental status |
| Hooks Editor | Phase 1 MVP feature | Moved to Phase 2 (viewer stays Phase 1) | Reviewer: too brittle/version-sensitive for MVP |
| Plugins/Extensions | Phase 2 with install/uninstall | Demoted to Phase 3, scanner-only (no install/uninstall until later) | Reviewer: nested config graphs + marketplace auth = trap |
| Cross-tool conversion | Implicit "it just works" | Added "best effort" framing + manual review warning | Reviewer: arg patterns don't map cleanly across tools |
| "Why is this disabled?" | Not present | New UX pattern added to Detected Reality panel | Reviewer suggestion: turns confusion into trust |
| Non-Goals | Not present | Explicit section: not a CLI replacement, not a secrets manager, not a behavioral abstraction | Reviewer: preempts scope creep and user complaints |
| Enable/Disable semantics | Undefined | Defined: native mechanism where available, rename convention otherwise, never delete | Reviewer: implementation ambiguity risk |
| Internal data model | Implicit | Named `LoadoutItem` with defined shape | Reviewer: helps contributors reason consistently |
| Default first-run tab | Unspecified | MCP Registry (fewer items, health checks, fastest "aha moment") | Reviewer: UX insight |
| Product name | AgentConfig | Loadout | Author decision |

### v1.0 → v2.0

| Item | v1.0 | v2.0 | Source |
|------|------|------|--------|
| Codex skills path | `~/.codex/skills/` | `$HOME/.agents/skills/` (primary) + `~/.codex/skills/` (scan as fallback) | Official docs + reviewer verification |
| Codex MCP key | `[mcp.servers]` | `[mcp_servers.<name>]` (underscore, not dot) | Official Codex MCP docs |
| Codex custom prompts | Active feature | Deprecated (prefer skills); treat as legacy/import-only | Official docs deprecation label |
| Claude commands | Separate feature | Legacy compatibility; skills are the preferred mechanism | Directional guidance from docs |
| Gemini skills/hooks | Verified | Documented but experimental (require `experiments.*` flags) | Official Gemini CLI docs |
| Architecture | Immediate read/write | Read-first MVP: scan → display → validate → diff/export, then add write-back | Reviewer recommendation |

---

## Verified Feature Landscape

### Source: Official Documentation (Verified Feb 2026, cross-checked by multiple reviewers)

| Feature | Claude Code | Codex CLI | Gemini CLI |
|---------|-------------|-----------|------------|
| **Skills** | ✅ Stable | ✅ Stable | ⚠️ Experimental |
| **MCPs** | ✅ Stable | ✅ Stable | ✅ Stable |
| **Hooks** | ✅ Rich (11 events) | ⚠️ `notify` only | ⚠️ Rich but experimental (11 events) |
| **Plugins/Extensions** | ✅ Full system | ❌ None | ✅ Full system |
| **Custom Commands** | ⚠️ Legacy (prefer skills) | ⚠️ Deprecated (prefer skills) | ✅ Active |
| **Subagents** | ✅ Stable | ❌ None | ⚠️ Experimental |
| **System Prompts** | ✅ `CLAUDE.md` | ✅ `AGENTS.md` | ✅ `GEMINI.md` |

### Skills Discovery Paths

| Tool | Scope | Path |
|------|-------|------|
| **Claude Code** | User | `~/.claude/skills/<name>/SKILL.md` |
| **Claude Code** | Project | `.claude/skills/<name>/SKILL.md` |
| **Codex CLI** | User | `$HOME/.agents/skills/<name>/SKILL.md` |
| **Codex CLI** | Repo (CWD) | `$CWD/.codex/skills/<name>/SKILL.md` |
| **Codex CLI** | Repo (parent) | `$CWD/../.codex/skills/<name>/SKILL.md` |
| **Codex CLI** | Repo (root) | `$REPO_ROOT/.codex/skills/<name>/SKILL.md` |
| **Codex CLI** | Admin | `/etc/codex/skills/<name>/SKILL.md` |
| **Codex CLI** | System | Bundled with Codex |
| **Gemini CLI** | User | `~/.gemini/skills/<name>/SKILL.md` |
| **Gemini CLI** | Project | `.gemini/skills/<name>/SKILL.md` |

> **Implementation note:** Codex uses `.agents/skills` for user-level skill discovery but `.codex/skills` for repo-scoped skills. The tool should scan ALL candidate paths and report what actually exists on disk ("Detected Reality" approach). This also provides migration tolerance if paths change in future releases.

### MCP Configuration Formats

| Tool | Config Location | Key Format |
|------|----------------|------------|
| Claude Code | `~/.claude.json` or `.mcp.json` (project) | `"mcpServers": { "<name>": {...} }` (JSON) |
| Codex CLI | `~/.codex/config.toml` | `[mcp_servers.<name>]` (TOML, underscore not dot) |
| Gemini CLI | `~/.gemini/settings.json` | `"mcpServers": { "<name>": {...} }` (JSON) |

### System Prompt Files

| Tool | Global | Project | Override |
|------|--------|---------|----------|
| Claude Code | `~/.claude/CLAUDE.md` | `.claude/CLAUDE.md` | N/A |
| Codex CLI | `~/.codex/AGENTS.md` | `AGENTS.md` or `.codex/AGENTS.md` | `AGENTS.override.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` | `.gemini/GEMINI.md` | N/A |

---

## Feature Specifications

### 1. Skills Management

#### What It Does
View, install, enable/disable, and sync skills across all three CLIs.

#### Technical Details

| Tool | User-Level Location | Invocation | Maturity |
|------|-------------------|------------|----------|
| Claude Code | `~/.claude/skills/<n>/SKILL.md` | `/<n>` or auto | Stable |
| Codex CLI | `$HOME/.agents/skills/<n>/SKILL.md` | `$<n>` or auto | Stable |
| Gemini CLI | `~/.gemini/skills/<n>/SKILL.md` | Auto-invoked only | Experimental (`experiments.agentSkills: true`) |

#### Shared Format (Open Agent Skills Standard — agentskills.io)
All three tools use the same SKILL.md format:

```markdown
---
name: skill-name
description: When to use this skill
metadata:
  short-description: Optional user-facing description
---

## Instructions
Your skill content here...
```

Skills use **progressive disclosure**: at startup, only name + description are loaded. Full content is read on activation.

#### MVP Features (Phase 1 — Read-Only)

- [ ] **Multi-Path Skill Scanner**: Scan ALL documented skill locations per tool (user, repo, admin) and report what's found
- [ ] **Skill Viewer**: View SKILL.md content with syntax highlighting
- [ ] **Conflict Detection**: Warn when same skill name exists with different content across tools or scopes
- [ ] **Maturity Flags**: Show whether a skill feature is stable vs experimental per tool
- [ ] **"Why is this disabled?"**: If Gemini skills exist but `experiments.agentSkills` is false, explain inline

#### Phase 2 Features (Write)

- [ ] **Enable/Disable**: Toggle skills per-tool
- [ ] **Install from URL**: Install skills from GitHub repos (e.g., `openai/skills`)
- [ ] **Cross-Tool Sync**: "Install this skill to all supported tools" — writes to each tool's correct user-level path (subject to tool support and maturity)

#### Priority: HIGH
**Rationale**: Skills are the most portable feature — same format across all tools, same open standard.

---

### 2. MCP Server Management

#### What It Does
Unified view and management of Model Context Protocol servers across all tools.

#### Technical Details

| Tool | Config Location | Format |
|------|----------------|--------|
| Claude Code | `~/.claude.json` or `.mcp.json` | JSON |
| Codex CLI | `~/.codex/config.toml` → `[mcp_servers.<name>]` | TOML |
| Gemini CLI | `~/.gemini/settings.json` → `mcpServers` | JSON |

#### Claude Code MCP Format
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@org/mcp-server"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

#### Codex CLI MCP Format
```toml
[mcp_servers.server-name]
command = "npx"
args = ["-y", "@org/mcp-server"]

[mcp_servers.server-name.env]
API_KEY = "..."
```

#### Gemini CLI MCP Format
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@org/mcp-server"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

#### MVP Features (Phase 1 — Read-Only)

- [ ] **MCP Registry**: Unified view of all configured MCPs across tools
- [ ] **Health Check**: Test if MCP server is reachable/running
- [ ] **Format Comparison**: Show how the same MCP is configured differently across tools (JSON vs TOML key names)

#### Phase 2 Features (Write)

- [ ] **Add MCP Wizard**: Form-based MCP addition with automatic format conversion (JSON ↔ TOML)
- [ ] **Cross-Tool Sync**: Add MCP to all three tools at once
- [ ] **Enable/Disable**: Toggle MCPs per-tool without deleting config
- [ ] **Tool Discovery**: Show which tools each MCP provides
- [ ] **Format Validation**: Verify generated config matches each tool's expected schema

#### Priority: HIGH
**Rationale**: MCPs are critical for extending capabilities; format differences (JSON vs TOML, different key names) make manual sync tedious and error-prone.

---

### 3. Hooks Management

#### What It Does
View and manage hooks for Claude Code and Gemini CLI. Codex has only a basic `notify` mechanism (not a true hook system).

#### Technical Details

| Hook Event | Claude Code | Gemini CLI | Codex CLI |
|------------|-------------|------------|-----------|
| Before tool use | ✅ `PreToolUse` | ✅ `BeforeTool` | ❌ |
| After tool use | ✅ `PostToolUse` | ✅ `AfterTool` | ❌ |
| After tool use (failure) | ✅ `PostToolUseFailure` | ❌ | ❌ |
| Permission decisions | ✅ `PermissionRequest` | ❌ | ❌ |
| Session start | ✅ `SessionStart` | ✅ `SessionStart` | ❌ |
| Session end | ✅ `SessionEnd` | ✅ `SessionEnd` | ❌ |
| Before model call | ❌ | ✅ `BeforeModel` | ❌ |
| After model call | ❌ | ✅ `AfterModel` | ❌ |
| Before agent loop | ❌ | ✅ `BeforeAgent` | ❌ |
| After agent loop | ❌ | ✅ `AfterAgent` | ❌ |
| Tool selection | ❌ | ✅ `BeforeToolSelection` | ❌ |
| User prompt submit | ✅ `UserPromptSubmit` | ❌ | ❌ |
| Stop/Continue | ✅ `Stop`, `SubagentStop` | ❌ | ❌ |
| Notifications | ✅ `Notification` | ✅ `Notification` | ✅ `notify` (limited: external program on agent-turn-complete, no interception/blocking) |
| Pre-compact | ✅ `PreCompact` | ✅ `PreCompress` | ❌ |

> **Note:** Gemini hooks require `experiments.enableHooks: true` in settings.json. They have a formal reference at geminicli.com/docs/hooks/.

#### Claude Code Hook Config (in `settings.json`)
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Write",
      "hooks": [{
        "type": "command",
        "command": "/path/to/script.sh"
      }]
    }]
  }
}
```

#### Gemini CLI Hook Config (in `settings.json`)
```json
{
  "hooks": {
    "BeforeTool": [{
      "matcher": "write_file|run_shell_command",
      "hooks": [{
        "type": "command",
        "command": "/path/to/script.sh"
      }]
    }]
  }
}
```

#### MVP Features (Phase 1 — Read-Only)

- [ ] **Hook Viewer**: Display all configured hooks with their matchers and scripts
- [ ] **Event Mapping**: Show equivalent events across tools (use table above)
- [ ] **"Why is this disabled?"**: If Gemini hooks exist but `experiments.enableHooks` is false, explain inline

#### Phase 2 Features (Write)

- [ ] **Hook Editor**: Visual editor for hook configuration (Claude Code + Gemini)
- [ ] **Script Management**: Manage hook scripts in a central location
- [ ] **Test Hook**: Run a hook manually to verify it works

#### Priority: MEDIUM
**Rationale**: Hooks are powerful but the most brittle and version-sensitive feature. Read-only viewer is safe; visual editor that writes JSON across two different schemas should wait until the read layer is proven.

---

### 4. Plugins/Extensions Management

#### What It Does
Manage plugins (Claude Code) and extensions (Gemini CLI). Codex has no plugin system.

#### Technical Details

| Feature | Claude Code Plugins | Gemini CLI Extensions |
|---------|--------------------|-----------------------|
| Location | `.claude-plugin/plugin.json` | `gemini-extension.json` |
| Components | Skills, Commands, Agents, Hooks, MCP | Skills, Commands, Hooks, MCP, Context |
| Install Method | `/plugin install` | `gemini extensions install` |
| Marketplace | Yes (community) | Yes (gallery) |
| Namespacing | `/plugin-name:command` | Extension name prefix |

#### Claude Code Plugin Structure
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
├── commands/
├── agents/
├── hooks/
└── .mcp.json
```

#### Gemini CLI Extension Structure
```
my-extension/
├── gemini-extension.json
├── GEMINI.md
├── commands/
├── skills/
└── hooks/
```

#### MVP Features (Phase 3 — Scanner Only)

- [ ] **Plugin Scanner**: List installed plugins/extensions
- [ ] **Component Viewer**: Show what each plugin provides (skills, hooks, etc.)

#### Future Features (Post-MVP)

- [ ] **Marketplace Browser**: Search community plugins/extensions
- [ ] **Install/Uninstall**: Manage plugins from UI
- [ ] **Enable/Disable**: Toggle without uninstalling

#### Priority: LOW
**Rationale**: Plugins introduce nested config graphs, install/uninstall side effects, marketplace auth flows, and version compatibility concerns. High surface area for comparatively low immediate value. Scanner + viewer first; install/uninstall capabilities deferred until core features are stable.

> **Warning:** Plugin install/uninstall should be the last write capability added. A bad plugin operation can affect skills, hooks, MCPs, and commands simultaneously.

---

### 5. Custom Commands Management

#### What It Does
View and manage custom slash commands across all tools. Note maturity differences.

#### Technical Details

| Tool | Location | Format | Invocation | Status |
|------|----------|--------|------------|--------|
| Claude Code | `~/.claude/commands/<n>.md` | Markdown | `/<n>` | ⚠️ Legacy (prefer skills) |
| Codex CLI | `~/.codex/prompts/<n>.md` | Markdown + YAML frontmatter | `/prompts:<n>` | ⚠️ **Deprecated** (prefer skills) |
| Gemini CLI | `~/.gemini/commands/<n>.toml` | TOML | `/<n>` | ✅ Active |

#### Codex Prompt Format (Deprecated)
```markdown
---
description: Prep a branch, commit, and open a draft PR
argument-hint: [FILES=<paths>] [PR_TITLE="<title>"]
---

Prompt content here. Use $1-$9 for positional, $NAME for named.
```

#### Gemini CLI Command Format
```toml
name = "command-name"
description = "What this does"
prompt = "Prompt content here"
```

#### MVP Features

- [ ] **Command List**: Unified view of all custom commands with status badges (Active / Legacy / Deprecated)
- [ ] **Command Editor**: Create/edit commands with preview
- [ ] **Cross-Tool Conversion** (best effort): Convert command format between tools
- [ ] **Argument Support**: Show which commands accept `$ARGUMENTS`
- [ ] **Prompt → Skill Converter** (best effort): Import deprecated Codex custom prompts and convert to Agent Skills format

> **Important:** Cross-tool conversion and prompt-to-skill migration are best-effort. Some prompts rely on tool-specific behavior (e.g., Codex positional args `$1`-`$9`, implicit env access) that won't map cleanly. Converted artifacts should be flagged for manual review before use.

#### Priority: LOW
**Rationale**: Commands are moving toward skills; main value is migration tooling.

---

### 6. Subagents Management (Claude Code Only)

#### What It Does
View and manage Claude Code subagents. (Codex has nothing comparable; Gemini's is experimental.)

#### Technical Details

| Feature | Claude Code |
|---------|-------------|
| Location | `~/.claude/agents/<n>.md` |
| Built-in | Explore, Plan, claude-code-guide |
| Tool Restrictions | Configurable per agent |
| Model Override | Can specify different model |
| Hooks | Support agent-specific hooks |

#### Agent File Format
```markdown
---
name: agent-name
description: What this agent does
tools: Read, Grep, Glob, Bash
model: opus
---

Agent instructions here...
```

#### MVP Features

- [ ] **Agent List**: View all configured agents
- [ ] **Agent Editor**: Create/edit agent definitions
- [ ] **Tool Restrictions**: Visual editor for allowed tools
- [ ] **Test Agent**: Spawn agent for testing

#### Priority: LOW
**Rationale**: Claude Code-specific; less cross-tool value.

---

### 7. System Prompt Management

#### What It Does
View and edit system prompt files (CLAUDE.md, AGENTS.md, GEMINI.md).

#### Technical Details

| Tool | Global | Project | Override |
|------|--------|---------|----------|
| Claude Code | `~/.claude/CLAUDE.md` | `.claude/CLAUDE.md` | N/A |
| Codex CLI | `~/.codex/AGENTS.md` | `AGENTS.md` or `.codex/AGENTS.md` | `AGENTS.override.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` | `.gemini/GEMINI.md` | N/A |

#### MVP Features

- [ ] **Side-by-Side View**: Compare prompts across tools
- [ ] **Diff View**: Show differences between global and project prompts
- [ ] **Editor**: Edit with Markdown preview
- [ ] **Template Library**: Common prompt templates

#### Priority: MEDIUM
**Rationale**: System prompts are critical but rarely change; visual diff is helpful.

---

### 8. Settings & Permissions Management

#### What It Does
Manage general settings, permissions, and sandbox configurations.

#### Technical Details

| Setting | Claude Code | Codex CLI | Gemini CLI |
|---------|-------------|-----------|------------|
| Config Location | `~/.claude/settings.json` | `~/.codex/config.toml` | `~/.gemini/settings.json` |
| Approval Policy | `allowedCommands` | `approval_policy` | Tool confirmations |
| Sandbox Mode | Permission system | `sandbox_mode` | `sandbox` settings |
| Model Selection | Via UI or env | `model` in config | `model` in settings |
| Web Search | Enabled by default | `web_search` config | Google Search tool |

#### MVP Features

- [ ] **Settings Overview**: Unified view of key settings across tools
- [ ] **Permission Allowlist**: Visual editor for allowed commands/paths
- [ ] **Model Selection**: Change default model per tool
- [ ] **Sandbox Config**: Configure sandbox settings

#### Priority: LOW
**Rationale**: Settings change infrequently; CLI/UI works fine.

---

## Recommended MVP Scope

### Architecture Principle: Read-First

The MVP should be a **read-only dashboard** first:
1. **Scan** — Discover all config files across all tools
2. **Display** — Unified view of what's configured where
3. **Validate** — Check for conflicts, deprecated features, missing configs
4. **Diff/Export** — Compare across tools, export normalized configs

Write-back capabilities (editing configs, cross-tool sync) come in Phase 2 after the read layer is proven safe. Each tool's config surface is shifting rapidly, and "write-back" is where you can brick someone's setup.

### Key Definitions

**"Enable/Disable" semantics (Phase 2):** Disable means the config remains on disk but is made inactive using the tool's native mechanism where one exists. Where no native mechanism exists, Loadout uses a rename convention (e.g., `skill-name/` → `_disabled_skill-name/`). Config is never deleted by a disable action — only made inactive and reversible.

**Internal data model — `LoadoutItem`:** All scanned configs (skills, MCPs, hooks, commands, etc.) normalize into a common internal representation called a `LoadoutItem`. This is the single abstraction that the frontend renders regardless of source tool or config format.

```
LoadoutItem {
  id: string              // unique hash
  name: string            // human-readable name
  type: skill | mcp | hook | command | agent | prompt | plugin
  sourceTool: claude | codex | gemini
  scope: user | repo | admin | system
  maturity: stable | experimental | deprecated
  path: string            // absolute path on disk
  isActive: boolean       // is this item currently functional?
  blockers: string[]      // reasons it's inactive (e.g., "experiments.agentSkills is false")
  raw: object             // original parsed config for inspection
}
```

### UX: Default First-Run View

The default tab on first launch is **MCP Registry**, not Skills. Rationale:
- MCPs are fewer items — less overwhelming on first run
- Health checks (green/red) give immediate visual feedback
- Cross-tool inconsistency is most obviously valuable here ("GitHub MCP in Claude and Gemini but not Codex" jumps off the screen)
- MCPs demonstrate Loadout's value proposition fastest

Skills is the second tab. Dashboard overview is accessible but not the landing page.

### Phase 1: Read-Only Dashboard (Weeks 1-4)

1. **Skills Scanner** (HIGH)
   - Scan ALL documented skill paths per tool (including `.agents/skills` for Codex)
   - Display unified list with scope labels (user/repo/admin/system)
   - Show maturity badges (Stable / Experimental / Deprecated)
   - View skill content with syntax highlighting

2. **MCP Scanner** (HIGH)
   - Scan all tools' MCP configs
   - Display unified registry with format details
   - Health check (is the MCP server reachable?)
   - Show format differences (JSON vs TOML key naming)

3. **System Prompt Viewer** (MEDIUM)
   - Side-by-side view of CLAUDE.md / AGENTS.md / GEMINI.md
   - Diff between global and project-level prompts

4. **Detected Reality Panel** (HIGH — cross-cutting)
   - For each tool: detect installed version, show which features are available
   - List all paths scanned and whether they exist on disk
   - Flag experimental features that require opt-in flags
   - Surface any config that doesn't match expected schema
   - **"Why is this disabled?" inline explainers**: When a feature is detected but non-functional (e.g., Gemini skills found but `experiments.agentSkills` is false), show a contextual explanation with the exact fix needed. Turns confusion into trust.

### Phase 2: Write Capabilities (Weeks 5-8)

5. **Cross-Tool Skill Install**: Write skills to correct path per tool
6. **MCP Sync**: Add MCP to all tools with format conversion
7. **Hooks Editor**: Visual editor for Claude Code + Gemini hooks (read-only viewer already in Phase 1)
8. **Prompt → Skill Converter** (best effort): Import deprecated Codex prompts as skills, flag for manual review

### Phase 3: Extended Features (Weeks 9-12)

9. **Plugins/Extensions Scanner**: Read-only browser of installed plugins + component viewer
10. **Commands Management**: View + cross-tool conversion (best effort)
11. **Settings Management**: Unified settings editor
12. **Subagents**: View and edit (Claude Code)

### Future (Post v1.0)

13. **Plugin Install/Uninstall**: Full marketplace integration (deferred due to complexity)
14. **Hook Script Marketplace**: Community hook scripts
15. **Config Export/Import**: Portable config bundles

---

## Technical Architecture

### Stack (Decided)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | **Tauri 2.x** | Cross-platform native app, ~15MB binary (vs ~150MB Electron), system webview, low memory. CC-Switch proves this works for this exact problem domain. |
| Frontend | **React 18 + TypeScript + Vite** | Hot module replacement for instant UI iteration. Identical stack whether using Tauri or Electron — no migration cost. |
| UI Library | **shadcn/ui + Tailwind CSS** | Clean, customizable components. Same as CC-Switch. |
| State | **Zustand** | Minimal boilerplate, works well with React. |
| Data Fetching | **TanStack Query v5** | Caching, background refetching, loading states for scanner results. |
| Config Editing | **CodeMirror 6** | Syntax highlighting for JSON, TOML, Markdown config files. |
| Backend (Rust) | **serde** (JSON/TOML parsing), **tokio** (async file I/O), **notify** crate (file watching), **thiserror** (error handling) | Native TOML + JSON parsing without external deps. File watching via OS-level APIs. |
| IPC | **Tauri Commands** | Type-safe bridge between React frontend and Rust backend. Typed API wrapper on the TS side. |
| Auto-Updates | **tauri-plugin-updater** | Built-in update flow for distribution. |
| Testing | **Vitest** (frontend) + **cargo test** (backend) | Split testing by layer. Frontend unit tests + Rust backend tests. |
| Package Manager | **pnpm** | Fast, disk-efficient. Same as CC-Switch. |

### Dev Flow

```bash
# Install dependencies
pnpm install

# Dev mode — Vite HMR for frontend, Tauri watches Rust for backend
pnpm tauri dev

# Frontend edit: save file → ~200ms hot reload (identical to Electron)
# Backend edit: save file → ~5-15s Rust incremental compile → app restarts

# Build distributable
pnpm tauri build          # Produces .dmg (Mac), .exe (Windows later)

# Testing
pnpm test:unit            # Frontend (Vitest)
cd src-tauri && cargo test # Backend (Rust)
```

### Project Structure

```
loadout/
├── src/                        # Frontend (React + TypeScript)
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── skills/             # Skills-related components
│   │   ├── mcps/               # MCP-related components
│   │   ├── hooks-view/         # Hooks viewer components
│   │   └── detected-reality/   # Reality panel components
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main overview
│   │   ├── Skills.tsx          # Skills scanner + viewer
│   │   ├── MCPs.tsx            # MCP registry
│   │   ├── Hooks.tsx           # Hooks viewer
│   │   └── Prompts.tsx         # System prompt comparison
│   ├── stores/                 # Zustand stores
│   ├── lib/
│   │   ├── api/                # Tauri IPC wrapper (type-safe)
│   │   └── query/              # TanStack Query config
│   └── types/                  # Shared TypeScript types
├── src-tauri/                  # Backend (Rust)
│   └── src/
│       ├── commands/           # Tauri command handlers (by domain)
│       │   ├── skills.rs
│       │   ├── mcps.rs
│       │   ├── hooks.rs
│       │   └── prompts.rs
│       ├── scanners/           # File scanning logic
│       │   ├── skills.rs       # Multi-path skill scanner
│       │   ├── mcps.rs         # MCP config reader (JSON + TOML)
│       │   ├── hooks.rs        # Hook config reader
│       │   └── reality.rs      # Detected Reality aggregator
│       ├── parsers/            # Config file parsers
│       │   ├── json_config.rs
│       │   ├── toml_config.rs
│       │   └── skill_md.rs     # YAML frontmatter + Markdown
│       ├── models.rs           # Normalized data model (unified types)
│       ├── watcher.rs          # chokidar-equivalent file watching (notify crate)
│       └── lib.rs              # App entry + Tauri setup
├── tests/                      # Frontend tests (Vitest)
├── tauri.conf.json             # Tauri configuration
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

### Why Tauri Over Electron

| Factor | Tauri | Electron |
|--------|-------|----------|
| Binary size | ~15MB | ~150MB |
| Memory usage | System webview (low) | Bundled Chromium (high) |
| Backend iteration speed | ~5-15s (Rust compile) | ~1-2s (Node restart) |
| Frontend iteration speed | ~200ms (Vite HMR) | ~200ms (Vite HMR) |
| Distribution | `.dmg`, `.exe`, `.AppImage` native | `.dmg`, `.exe` via electron-builder |
| Proven for this domain | CC-Switch (4.3k stars) uses Tauri for same problem | — |

**Decision**: Tauri. The backend iteration speed difference (5-15s vs 1-2s) only affects ~10-20% of edits and is negligible when AI agents write the code. The 10x smaller binary, lower memory, and native feel matter more for distribution. No migration needed later.

### Distribution (Mac First, Windows Later)

| Platform | Format | Status |
|----------|--------|--------|
| macOS | `.dmg` + Homebrew tap | Phase 1 |
| Windows | `.exe` / `.msi` installer | Phase 2 (just a build target flag, no code changes) |
| Linux | `.AppImage` / `.deb` | Future |

### Config Locations Reference

```
~/.claude/
├── settings.json          # Hooks, permissions
├── skills/                # Skills (user-level)
├── commands/              # Custom commands (LEGACY — prefer skills)
├── agents/                # Subagents
└── CLAUDE.md              # System prompt (global)

~/.claude.json             # MCPs (global)
.mcp.json                  # MCPs (project)
.claude/CLAUDE.md          # System prompt (project)
.claude/skills/            # Skills (project)

~/.agents/
└── skills/                # Codex user-level skills (PRIMARY)

~/.codex/
├── config.toml            # Settings, MCPs ([mcp_servers.*])
├── prompts/               # Custom prompts (DEPRECATED — prefer skills)
├── AGENTS.md              # System prompt (global)
└── AGENTS.override.md     # System prompt override

$CWD/.codex/skills/        # Codex repo-scoped skills (CWD)
$REPO_ROOT/.codex/skills/  # Codex repo-scoped skills (root)
/etc/codex/skills/          # Codex admin-level skills
AGENTS.md                  # System prompt (project, alt location)
.codex/AGENTS.md           # System prompt (project)

~/.gemini/
├── settings.json          # Settings, hooks, MCPs, experiment flags
├── skills/                # Skills (user-level, EXPERIMENTAL)
├── commands/              # Custom commands
├── extensions/            # Installed extensions
└── GEMINI.md              # System prompt (global)

.gemini/GEMINI.md          # System prompt (project)
.gemini/skills/            # Skills (project)
```

---

## Competitive Analysis

| Tool | Skills | MCPs | Hooks | Plugins | Commands | Cross-Tool | Read-First |
|------|--------|------|-------|---------|----------|------------|------------|
| CC-Switch | ⚠️ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| coder-config | ❌ | ✅ | ❌ | ⚠️ | ❌ | ✅ | ❌ |
| **Loadout** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Key Differentiator**: Loadout is the only tool that manages ALL configuration types across ALL three major AI coding CLIs, with a read-first architecture that validates against disk reality rather than assuming config paths.

---

## Success Metrics

1. **Installation**: Time to install and see first unified view < 2 minutes
2. **Detected Reality**: Tool correctly identifies 100% of installed skills/MCPs/hooks on first scan
3. **Cross-Tool Sync**: (Phase 2) Add MCP to all tools in < 30 seconds
4. **Skill Management**: (Phase 2) Install skill from GitHub to all tools in < 1 minute
5. **Conflict Detection**: 100% detection of duplicate/conflicting configs
6. **Version Awareness**: Correctly flags experimental vs stable features per detected CLI version

---

## Appendix A: Config File Formats

### Claude Code settings.json
```json
{
  "permissions": {
    "allow": ["Bash(npm:*)", "Write(~/.claude/*)"],
    "deny": []
  },
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...]
  }
}
```

### Codex CLI config.toml
```toml
model = "gpt-5.2-codex"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[mcp_servers.github]
command = "npx"
args = ["-y", "@github/mcp-server"]

[mcp_servers.github.env]
GITHUB_TOKEN = "..."

[features]
web_search = true
```

### Gemini CLI settings.json
```json
{
  "model": "gemini-2.5-pro",
  "sandbox": true,
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"]
    }
  },
  "hooks": {
    "BeforeTool": [...],
    "AfterTool": [...]
  },
  "experiments": {
    "enableHooks": true,
    "agentSkills": true
  }
}
```

---

## Appendix B: Hook Event Mapping

| Purpose | Claude Code | Gemini CLI |
|---------|-------------|------------|
| Validate before tool runs | `PreToolUse` | `BeforeTool` |
| Process after tool runs | `PostToolUse` | `AfterTool` |
| Handle tool failure | `PostToolUseFailure` | ❌ |
| Initialize session | `SessionStart` | `SessionStart` |
| Cleanup on exit | `SessionEnd` | `SessionEnd` |
| Handle notifications | `Notification` | `Notification` |
| Before context compression | `PreCompact` | `PreCompress` |
| Allow/deny permissions | `PermissionRequest` | ❌ |
| Validate user prompt | `UserPromptSubmit` | ❌ |
| Control stop behavior | `Stop`, `SubagentStop` | ❌ |
| Before model call | ❌ | `BeforeModel` |
| After model response | ❌ | `AfterModel` |
| Before agent loop | ❌ | `BeforeAgent` |
| After agent loop | ❌ | `AfterAgent` |
| Filter tool selection | ❌ | `BeforeToolSelection` |

---

## Appendix C: Codex Skills Precedence

Skills are resolved in precedence order (high to low). Higher-precedence skills with the same name overwrite lower ones.

| Precedence | Scope | Location |
|------------|-------|----------|
| 1 (highest) | REPO | `$CWD/.codex/skills/` |
| 2 | REPO | `$CWD/../.codex/skills/` |
| 3 | REPO | `$REPO_ROOT/.codex/skills/` |
| 4 | USER | `$HOME/.agents/skills/` |
| 5 | ADMIN | `/etc/codex/skills/` |
| 6 (lowest) | SYSTEM | Bundled with Codex |

> **Key nuance:** Repo-scoped skills use `.codex/skills`, but user-level skills use `.agents/skills`. The tool must scan both path families.

---

## Appendix D: Feature Maturity Matrix

| Feature | Claude Code | Codex CLI | Gemini CLI |
|---------|-------------|-----------|------------|
| Skills | ✅ Stable | ✅ Stable | ⚠️ Experimental |
| MCPs | ✅ Stable | ✅ Stable | ✅ Stable |
| Hooks (rich) | ✅ Stable | ❌ N/A | ⚠️ Experimental |
| Notify | ✅ Stable | ✅ Basic | ✅ Stable |
| Plugins/Extensions | ✅ Stable | ❌ N/A | ✅ Stable |
| Custom Commands | ⚠️ Legacy | ⛔ Deprecated | ✅ Stable |
| Subagents | ✅ Stable | ❌ N/A | ⚠️ Experimental |
| System Prompts | ✅ Stable | ✅ Stable | ✅ Stable |

Legend: ✅ Stable | ⚠️ Experimental/Legacy | ⛔ Deprecated | ❌ Not available

---

## Appendix E: Name

**Chosen:** Loadout

*Previous candidates: AgentConfig, VibeStack, CLIConfig, AgentDash, ConfigHQ, UnifiedAgent, AgentHub*

---

*Spec Version: 2.1 | Last Updated: February 5, 2026*
*Review History: v1.0 → external review (2 rounds) → v2.0 → product review → v2.1*
