# Issue 4: Config Overview (Reality + Prompts + Hooks)

**Phase:** 1 (Read-Only MVP)
**Status:** Pending

---

## Summary

The "Config" tab consolidates: system prompts comparison, hooks viewer, experiment flags, and "Detected Reality" panel showing what's actually on disk.

## Acceptance Criteria

### System Prompts
- [ ] Scan: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` (global + project)
- [ ] Side-by-side view of all three global prompts
- [ ] Show which files exist vs don't exist
- [ ] Click to view full content

> **Project root**: Use repo root (`.git` parent) when found, otherwise use selected folder.

### Hooks
- [ ] Parse hooks from Claude (`settings.json`) and Gemini (`settings.json`)
- [ ] Display hooks with event type, matcher, command
- [ ] Show Codex limitation: only `notify`, not full hooks
- [ ] Event mapping reference (PreToolUse ↔ BeforeTool, etc.)

### Detected Reality Panel
- [ ] Show all scanned paths with ✓ exists / ✗ missing
- [ ] Experiment flags status (Gemini `experiments.agentSkills`, `experiments.enableHooks`)
- [ ] **"Why is this disabled?"** explainers with fix instructions
- [ ] **Parse errors**: Show invalid JSON/TOML/YAML with error message and line number
- [ ] Summary: X skills, Y MCPs, Z hooks across tools

## Technical Details

### System Prompt Locations

| Tool | Global | Project |
|------|--------|---------|
| Claude | `~/.claude/CLAUDE.md` | `$PROJECT_ROOT/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` | `$PROJECT_ROOT/AGENTS.md` or `$PROJECT_ROOT/.codex/AGENTS.md` |
| Gemini | `~/.gemini/GEMINI.md` | `$PROJECT_ROOT/.gemini/GEMINI.md` |

> **MVP scope**: `AGENTS.override.md` is dropped — Codex-specific edge case.

### Hook Event Mapping

| Purpose | Claude Code | Gemini CLI | Codex |
|---------|-------------|------------|-------|
| Before tool | `PreToolUse` | `BeforeTool` | — |
| After tool | `PostToolUse` | `AfterTool` | — |
| Session start | `SessionStart` | `SessionStart` | — |
| Session end | `SessionEnd` | `SessionEnd` | — |
| Notifications | `Notification` | `Notification` | `notify` (limited) |

### Hook Config Format

**Claude Code** (`~/.claude/settings.json`):
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Write",
      "hooks": [{ "type": "command", "command": "/path/to/script.sh" }]
    }]
  }
}
```

**Gemini CLI** (`~/.gemini/settings.json`):
```json
{
  "hooks": {
    "BeforeTool": [{
      "matcher": "write_file",
      "hooks": [{ "type": "command", "command": "/path/to/script.sh" }]
    }]
  },
  "experiments": {
    "enableHooks": true,
    "agentSkills": true
  }
}
```

### "Why Disabled?" Explainers

```typescript
interface Blocker {
  item: string;       // "Gemini skills"
  reason: string;     // "experiments.agentSkills is false"
  fix: string;        // 'Add "experiments": {"agentSkills": true} to ~/.gemini/settings.json'
}
```

### Parse Error Display

```typescript
interface ParseError {
  path: string;       // "~/.claude.json"
  format: 'json' | 'toml' | 'yaml';
  message: string;    // "Unexpected token at line 5, column 12"
  line?: number;
}
```

Show in Reality panel: `⚠️ ~/.claude.json: Invalid JSON — unexpected token at line 5`

### Files to Create

```
src-tauri/src/
├── commands/config.rs
├── scanners/
│   ├── prompts.rs
│   ├── hooks.rs
│   └── reality.rs

src/
├── pages/Config.tsx
├── components/config/
│   ├── PromptsSection.tsx
│   ├── HooksSection.tsx
│   ├── RealityPanel.tsx
│   └── BlockerExplainer.tsx
```

## Test Plan

1. Create global prompts: `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md`
2. Configure hooks in Claude and Gemini settings.json
3. Set `experiments.agentSkills: false` in Gemini
4. Create some Gemini skills
5. Launch Loadout → Config tab
6. **Prompts section**: See all three prompts side-by-side
7. **Hooks section**: See all hooks with event types
8. **Reality panel**:
   - See all paths with exist/missing status
   - See "Why disabled?" for Gemini skills with fix instruction
   - See summary counts

## Dependencies

- Issue 1: App Bootstrap
- Issue 2: MCP Registry (for MCP count in summary)
- Issue 3: Skills Scanner (for skills count in summary)

## Notes

- This is the "trust builder" — shows exactly what Loadout sees on disk
- Hooks are read-only in MVP; editing comes later
- Consider collapsible sections for prompts/hooks/reality
