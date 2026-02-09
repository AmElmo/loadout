# Issue 4: Rules & Hooks Pages

**Phase:** 1 (Read-Only MVP)
**Status:** Done

---

## Summary

Dedicated **Rules** and **Hooks** pages in the sidebar, replacing the original "Config" umbrella. Rules shows all system prompt and rule files across Claude Code, Codex CLI, and Gemini CLI at both global and project levels. Hooks shows all configured hook events from Claude Code and Gemini CLI.

## What Changed from Original Spec

- **Removed** the "Detected Reality" panel, "Why Disabled?" explainers, parse error display, and summary counts — these added complexity without clear user value
- **Split** single "Config" page into two sidebar entries: **Rules** and **Hooks**
- **Added** comprehensive rules scanning: `.claude/rules/*.md` directories, `CLAUDE.local.md`, `AGENTS.override.md`, subdirectory scanning for Codex/Gemini
- **Card + modal UI** instead of side-by-side view — matches the Skills page pattern

## Acceptance Criteria

### Rules Page
- [x] Scan main prompt files: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` (global + project)
- [x] Check both root-level and config-dir locations (e.g., `CLAUDE.md` and `.claude/CLAUDE.md`)
- [x] Scan `.claude/rules/*.md` recursively (global + project)
- [x] Scan `.gemini/rules/*.md` recursively (project)
- [x] Detect `CLAUDE.local.md` (personal overrides, not committed)
- [x] Detect `AGENTS.override.md` (Codex priority overrides)
- [x] Scan subdirectories for `AGENTS.md`, `AGENTS.override.md`, `GEMINI.md` with directory pruning
- [x] Show cards with file name, tool badge, scope badge, file size
- [x] Click card to open modal with full content, copy button, and file path
- [x] Show "not found" state for missing files (greyed out, not clickable)
- [x] Separate global and project sections
- [x] Empty state with guidance on creating rule files

### Hooks Page
- [x] Parse hooks from Claude Code (`~/.claude/settings.json`)
- [x] Parse hooks from Gemini CLI (`~/.gemini/settings.json`)
- [x] Display hooks grouped by tool with event type, matcher, command
- [x] Empty state when no hooks configured

## Technical Details

### Rules Scanning Locations

| Tool | Global | Project |
|------|--------|---------|
| Claude | `~/.claude/CLAUDE.md` | `$ROOT/CLAUDE.md`, `$ROOT/.claude/CLAUDE.md`, `$ROOT/CLAUDE.local.md` |
| Claude rules | `~/.claude/rules/*.md` | `$ROOT/.claude/rules/*.md` (recursive) |
| Codex | `~/.codex/AGENTS.md` | `$ROOT/AGENTS.md`, `$ROOT/.codex/AGENTS.md`, `$ROOT/AGENTS.override.md` |
| Codex subdirs | — | `$ROOT/**/AGENTS.md`, `$ROOT/**/AGENTS.override.md` |
| Gemini | `~/.gemini/GEMINI.md` | `$ROOT/GEMINI.md`, `$ROOT/.gemini/GEMINI.md` |
| Gemini rules | — | `$ROOT/.gemini/rules/*.md` (recursive) |
| Gemini subdirs | — | `$ROOT/**/GEMINI.md` |

### Subdirectory Scanning

Uses `walkdir` with `max_depth(10)` and aggressive pruning of 27 directories (`node_modules`, `.git`, `target`, `dist`, `build`, etc.) for performance.

### Hook Config Sources

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
  }
}
```

### Files

```
src-tauri/src/
├── commands/config.rs          # scan_rules + scan_hooks commands
├── scanners/
│   ├── prompts.rs              # Rules scanner (main files, rules dirs, subdirs)
│   └── hooks.rs                # Hooks scanner (Claude + Gemini settings.json)

src/
├── pages/Rules.tsx             # Rules page with TanStack Query
├── pages/Hooks.tsx             # Hooks page with TanStack Query
├── lib/api/config.ts           # scanRules() + scanHooks() API wrappers
├── components/config/
│   ├── index.ts                # Barrel exports
│   ├── PromptsSection.tsx      # Rules list with global/project sections
│   ├── RuleCard.tsx            # Clickable card for each rule file
│   ├── RuleViewer.tsx          # Modal viewer with content + copy
│   └── HooksSection.tsx        # Hooks display grouped by tool
```

### Sidebar Navigation

Four entries: **MCPs** | **Skills** | **Rules** | **Hooks**

## Test Plan

1. Create global prompts: `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md`
2. Create rules: `~/.claude/rules/code-style.md`, `~/.claude/rules/frontend/react.md`
3. In a workspace: create `CLAUDE.md`, `.claude/rules/testing.md`, `AGENTS.md`, `GEMINI.md`
4. Create `CLAUDE.local.md` and `AGENTS.override.md` in workspace root
5. Create `src/api/AGENTS.md` in a subdirectory
6. Configure hooks in `~/.claude/settings.json` and `~/.gemini/settings.json`
7. Launch Loadout → **Rules** page:
   - See global rules section with main files + rules directory files
   - Select workspace → see project rules with all detected files
   - Click a card → modal shows full content with copy button
   - Missing files shown greyed out
8. Switch to **Hooks** page:
   - See hooks from Claude and Gemini grouped by tool
   - Each hook shows event type, matcher, command

## Dependencies

- Issue 1: App Bootstrap (workspace selection)
