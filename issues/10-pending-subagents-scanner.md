# Issue 10: Subagents Scanner + Sync

**Phase:** 2 (Write Capabilities)
**Status:** Pending

---

## Summary

Scan, display, and sync subagents across Claude Code and Gemini CLI. Subagents are the 5th pillar alongside Rules, Hooks, MCPs, and Skills — they are independent AI workers with their own context, tools, and model. Codex CLI does not support subagents yet (tracked as feature request openai/codex#2604).

## Acceptance Criteria

### Scanning
- [ ] Rust backend scans ALL subagent paths:
  - Claude: `~/.claude/agents/*.md` (user), `$PROJECT_ROOT/.claude/agents/*.md` (project)
  - Gemini: `~/.gemini/agents/*.md` (user), `$PROJECT_ROOT/.gemini/agents/*.md` (project)
- [ ] Parse YAML frontmatter + markdown body from agent `.md` files
- [ ] Extract agent-specific fields: `name`, `description`, `tools`, `model`, `maxTurns`, `permissionMode`
- [ ] Handle plain markdown fallback (derive name from filename, description from first line)
- [ ] Detect Gemini prerequisite: `enableAgents: true` in `~/.gemini/settings.json`

### Display
- [ ] Dedicated Subagents page accessible from sidebar navigation
- [ ] Agent list displays: name, description, source tool, scope, model, tools allowed
- [ ] Maturity badges: **Stable** (Claude), **Experimental** (Gemini)
- [ ] Codex shown as "Not Supported" in tool selector UI
- [ ] Click agent → view full agent definition with syntax highlighting
- [ ] Conflict detection: warn when same agent name exists with different content across tools
- [ ] Shadowing: project-level agents shadow user-level agents (same name, same tool)
- [ ] Empty state with guidance on how to create subagents

### Sync Between Tools
- [ ] "Sync to Other Tools" button on each AgentCard (same pattern as MCPCard/SkillCard)
- [ ] SyncDialog with tool selector (Claude + Gemini only, Codex disabled with tooltip)
- [ ] Write agent `.md` file to correct path per tool:
  - Claude: `~/.claude/agents/<filename>.md`
  - Gemini: `~/.gemini/agents/<filename>.md`
- [ ] For project-level sync:
  - Claude: `$PROJECT_ROOT/.claude/agents/<filename>.md`
  - Gemini: `$PROJECT_ROOT/.gemini/agents/<filename>.md`
- [ ] Success confirmation showing files created/modified
- [ ] Use existing safe write infrastructure (atomic writes, backups)

### Install New Agent
- [ ] "Add Agent" dialog (same pattern as AddMCPDialog/InstallSkillDialog)
- [ ] Form: name, description, model (dropdown), tools (multi-select), system prompt (textarea)
- [ ] Preview generated agent file before writing
- [ ] Select target tools (Claude, Gemini — Codex disabled)
- [ ] Write `.md` file with YAML frontmatter to selected tools

## Technical Details

### Agent Paths

| Tool | Scope | Path |
|------|-------|------|
| Claude Code | User | `~/.claude/agents/*.md` |
| Claude Code | Project | `$PROJECT_ROOT/.claude/agents/*.md` |
| Gemini CLI | User | `~/.gemini/agents/*.md` |
| Gemini CLI | Project | `$PROJECT_ROOT/.gemini/agents/*.md` |
| Codex CLI | — | Not supported |

### Agent File Format (Markdown + YAML Frontmatter)

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
maxTurns: 50
permissionMode: default
---

You are a senior code reviewer. When analyzing code, focus on...
```

#### Frontmatter Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Agent identifier |
| `description` | string | Yes | When to invoke this agent |
| `tools` | string (comma-separated) or list | No | Allowed tools (e.g., `Read, Glob, Grep`) |
| `model` | string | No | `haiku`, `sonnet`, `opus`, or inherit from parent |
| `maxTurns` | number | No | Max agentic turns before stopping |
| `permissionMode` | string | No | `default`, `plan`, `bypassPermissions` |

#### Plain Markdown Fallback

When no YAML frontmatter is present:
- Derive `name` from the **filename** (without `.md` extension)
- Derive `description` from the **first meaningful line** of content
- `tools`, `model`, `maxTurns` default to `null` (inherit from parent)

### AgentItem Shape

```typescript
interface AgentItem {
  /** Unique identifier (hash of name with agent_ prefix) */
  id: string;
  /** Agent name from frontmatter or filename */
  name: string;
  /** Agent description */
  description: string;
  /** Full markdown content (body after frontmatter) */
  content: string;
  /** Allowed tools (comma-separated in frontmatter) */
  tools: string | null;
  /** Model override */
  model: string | null;
  /** Max agentic turns */
  maxTurns: number | null;
  /** Permission mode */
  permissionMode: string | null;
  /** Which tool this agent is from */
  sourceTool: SourceTool;
  /** Scope level (user or project) */
  scope: 'user' | 'project';
  /** Feature maturity */
  maturity: Maturity;
  /** Absolute path to the agent .md file */
  path: string;
  /** True if shadowed by a higher-precedence agent */
  isShadowed: boolean;
  /** Path of the agent that shadows this one */
  shadowedBy: string | null;
  /** Which tools this agent is configured in (for merged view) */
  configuredIn: SourceTool[];
}
```

### AgentScanResult Shape

```typescript
interface AgentScanResult {
  agents: AgentItem[];
  conflicts: AgentConflict[];
}

interface AgentConflict {
  name: string;
  conflictingPaths: string[];
  tools: SourceTool[];
}
```

### Sync Types

```typescript
interface InstallAgentRequest {
  /** Filename (without .md extension) */
  filename: string;
  /** Full file content (frontmatter + body) */
  content: string;
  /** Scope: user-level or project-level */
  scope: 'user' | 'project';
  targetTools: SourceTool[];
}

interface SyncAgentRequest {
  /** Agent filename */
  filename: string;
  sourceTool: SourceTool;
  sourcePath: string;
  targetTools: SourceTool[];
  scope: 'user' | 'project';
}
```

### Write Paths

| Tool | Scope | Write Path |
|------|-------|-----------|
| Claude | User | `~/.claude/agents/<filename>.md` |
| Claude | Project | `$PROJECT_ROOT/.claude/agents/<filename>.md` |
| Gemini | User | `~/.gemini/agents/<filename>.md` |
| Gemini | Project | `$PROJECT_ROOT/.gemini/agents/<filename>.md` |

### Maturity by Tool

| Tool | Maturity | Notes |
|------|----------|-------|
| Claude Code | Stable | Production, well-documented |
| Gemini CLI | Experimental | Requires `enableAgents: true` in settings |
| Codex CLI | N/A | Not supported (feature requested) |

### Rust Implementation

#### Parser: `src-tauri/src/parsers/agent_md.rs`

Reuse the same YAML frontmatter parsing pattern as `skill_md.rs`:
- Split on `---` delimiters
- Parse YAML with `serde_yaml`
- Fall back to plain markdown if no frontmatter
- Extract additional fields (`tools`, `model`, `maxTurns`, `permissionMode`)

#### Scanner: `src-tauri/src/scanners/agents.rs`

- Scan `~/.claude/agents/` and `~/.gemini/agents/` for user-level
- Scan `$PROJECT_ROOT/.claude/agents/` and `$PROJECT_ROOT/.gemini/agents/` for project-level
- Merge agents with same name across tools into `configuredIn` list
- Detect conflicts (same name, different content across tools)
- Detect shadowing (project overrides user within same tool)
- Generate IDs with `agent_` prefix hash

#### Command: `src-tauri/src/commands/agents.rs`

```rust
#[tauri::command]
pub fn scan_agents(workspace_path: Option<String>) -> Result<AgentScanResult, String>
```

#### Sync: extend `src-tauri/src/commands/sync.rs`

```rust
#[tauri::command]
pub fn install_agent_to_tools(request: InstallAgentRequest) -> Result<WriteResult, String>

#[tauri::command]
pub fn sync_agent_to_tools(request: SyncAgentRequest) -> Result<WriteResult, String>
```

### Rust Crates

No new crates needed — reuse existing:
- `serde_yaml` — YAML frontmatter parsing
- `walkdir` — directory traversal (though agents dir is flat, not nested)
- `tempfile` + `chrono` — atomic writes + backups

### Files to Create

```
src-tauri/src/
├── commands/agents.rs          # scan_agents command
├── scanners/agents.rs          # Agent discovery + merge + conflict detection
├── parsers/agent_md.rs         # YAML frontmatter parser for agent .md files

src/
├── pages/Agents.tsx            # Dedicated agents page
├── lib/api/agents.ts           # scanAgents, installAgentToTools, syncAgentToTools
├── components/agents/
│   ├── index.ts                # Barrel export
│   ├── AgentList.tsx           # Filterable agent list
│   ├── AgentCard.tsx           # Expandable card with sync button
│   ├── AgentViewer.tsx         # Full content modal with syntax highlighting
│   ├── AgentModelBadge.tsx     # Shows model (haiku/sonnet/opus/inherit)
│   └── AgentToolsList.tsx      # Shows allowed tools as tags
├── components/sync/
│   └── InstallAgentDialog.tsx  # Form to create + install new agent
```

### Files to Modify

```
src-tauri/src/commands/mod.rs   # Add pub use agents::*
src-tauri/src/scanners/mod.rs   # Add pub use agents::*
src-tauri/src/parsers/mod.rs    # Add pub use agent_md::*
src-tauri/src/lib.rs            # Register scan_agents, install_agent_to_tools, sync_agent_to_tools
src/types/index.ts              # Add AgentItem, AgentScanResult, AgentConflict, InstallAgentRequest, SyncAgentRequest
src/App.tsx                     # Add /agents route + sidebar nav item
```

## Test Plan

### Scanning
1. Create agent files in various locations:
   - `~/.claude/agents/code-reviewer.md` (user, Claude)
   - `~/.gemini/agents/code-reviewer.md` (user, Gemini)
   - `$PROJECT_ROOT/.claude/agents/debugger.md` (project, Claude)
2. Launch Loadout → Agents page
3. Verify all agents appear with correct source tool and scope labels
4. `code-reviewer` shows `configuredIn: ['claude', 'gemini']`
5. Gemini agents show "Experimental" badge
6. Claude agents show "Stable" badge

### Frontmatter Parsing
7. Agent with full frontmatter (name, description, tools, model, maxTurns) → all fields displayed
8. Agent with minimal frontmatter (name only) → other fields show as "inherit"
9. Agent with no frontmatter (plain markdown) → name derived from filename, description from first line

### Conflict Detection
10. Create same agent name with different content in Claude and Gemini
11. Conflict warning appears on both cards

### Shadowing
12. Create `~/.claude/agents/reviewer.md` and `$PROJECT_ROOT/.claude/agents/reviewer.md`
13. User-level agent shows "Shadowed" indicator

### Sync
14. Click "Sync to Other Tools" on a Claude-only agent
15. SyncDialog shows Gemini checkbox enabled, Codex disabled with "Not Supported" tooltip
16. Select Gemini → click Sync
17. Verify `~/.gemini/agents/<name>.md` created with same content
18. Agent now shows `configuredIn: ['claude', 'gemini']`

### Install New
19. Click "Add Agent"
20. Fill form: name=`test-agent`, model=`sonnet`, tools=`Read, Grep`
21. Write system prompt in textarea
22. Select Claude + Gemini
23. Preview shows generated `.md` file
24. Click Install → verify files created at correct paths
25. New agent appears in list

### Edge Cases
26. Empty `~/.claude/agents/` directory → empty state shown
27. Non-`.md` files in agents directory → ignored
28. Agent with empty frontmatter → handled gracefully
29. Gemini without `enableAgents: true` → show warning that agents require opt-in

## Dependencies

- Issue 1: App Bootstrap (workspace selection)
- Issue 5: Sync infrastructure (atomic writes, backups)

## Notes

- **Codex gap**: Codex CLI doesn't support subagents natively. When/if it does, add scan paths. The UI should show Codex as "Not Supported" rather than hiding it, so users understand the limitation.
- **Naming**: The feature is called "Agents" in the UI (not "Subagents") since that's how Claude Code and Gemini CLI label them. Internally the code uses `agent` prefix to avoid confusion with the broader concept.
- **Format compatibility**: Claude Code and Gemini CLI use the same file format (Markdown + YAML frontmatter), so syncing is a direct file copy — no format conversion needed (unlike MCPs which need JSON ↔ TOML conversion).
- **Gemini experimental flag**: Scanner should check `~/.gemini/settings.json` for `enableAgents: true`. If absent, show a warning on Gemini agents that they may not be active.
- **Reuse patterns**: Follow the exact same component patterns as Skills (SkillCard → AgentCard, SkillList → AgentList, SkillViewer → AgentViewer). The sync logic mirrors InstallSkillDialog/SyncDialog.
- **Future**: Agent marketplaces are emerging (buildwithclaude.com, VoltAgent/awesome-claude-code-subagents). A future issue could add browsing/importing from these sources — similar to how Issue 7 handles importing MCPs/Skills from URL.
