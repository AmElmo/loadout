# Issue 3: Skills Scanner

**Phase:** 1 (Read-Only MVP)
**Status:** Pending

---

## Summary

Scan and display all skills across Claude Code, Codex CLI, and Gemini CLI with maturity badges, scope labels, conflict detection, and content viewer.

## Acceptance Criteria

- [ ] Rust backend scans ALL skill paths:
  - Claude: `~/.claude/skills/` (user), `$PROJECT_ROOT/.claude/skills/` (project)
  - Codex: `$HOME/.agents/skills/` (user), `$PROJECT_ROOT/.codex/skills/` (project)
  - Gemini: `~/.gemini/skills/` (user), `$PROJECT_ROOT/.gemini/skills/` (project)

> **Project root**: Use repo root (`.git` parent) when found, otherwise use selected folder.
- [ ] Parse YAML frontmatter + markdown from SKILL.md files
- [ ] Skill list displays: name, description, source tool, scope, maturity badge
- [ ] Maturity badges: **Stable** (Claude/Codex), **Experimental** (Gemini)
- [ ] Conflict detection: warn when same skill name exists with different content
- [ ] Precedence display: show which skill "wins" for Codex (repo > user)
- [ ] Click skill → view full SKILL.md with syntax highlighting
- [ ] Empty state when no skills found

## Technical Details

### Skills Paths

| Tool | Scope | Path |
|------|-------|------|
| Claude Code | User | `~/.claude/skills/<name>/SKILL.md` |
| Claude Code | Project | `$PROJECT_ROOT/.claude/skills/<name>/SKILL.md` |
| Codex CLI | User | `$HOME/.agents/skills/<name>/SKILL.md` |
| Codex CLI | Project | `$PROJECT_ROOT/.codex/skills/<name>/SKILL.md` |
| Gemini CLI | User | `~/.gemini/skills/<name>/SKILL.md` |
| Gemini CLI | Project | `$PROJECT_ROOT/.gemini/skills/<name>/SKILL.md` |

### SKILL.md Format (Open Agent Skills Standard)

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

### Maturity by Tool

| Tool | Maturity |
|------|----------|
| Claude Code | Stable |
| Codex CLI | Stable |
| Gemini CLI | Experimental (requires `experiments.agentSkills: true`) |

### Codex Precedence (higher wins)

1. `$REPO_ROOT/.codex/skills/` (repo)
2. `$HOME/.agents/skills/` (user)

> **MVP scope**: `/etc/codex/skills/` (admin) is dropped — edge case, may need elevated permissions.

Show "shadowed" indicator when user skill is overridden by repo skill.

### Project Path Rule

Use `$REPO_ROOT` (detected `.git` parent) for all project-scoped paths, not `$WORKSPACE`. This ensures skills are found even if user selects a subfolder.

### SkillItem Shape

```typescript
interface SkillItem {
  id: string;
  name: string;
  description: string;
  content: string;              // full markdown
  sourceTool: 'claude' | 'codex' | 'gemini';
  scope: 'user' | 'project';  // 'admin' dropped from MVP
  maturity: 'stable' | 'experimental';
  path: string;
  isShadowed: boolean;          // overridden by higher-precedence skill
  shadowedBy?: string;          // path of overriding skill
}
```

### Rust Crates

- `serde_yaml` — YAML frontmatter parsing
- `walkdir` — directory traversal
- `pulldown-cmark` — markdown parsing (optional, for preview)

### Files to Create

```
src-tauri/src/
├── commands/skills.rs
├── scanners/skills.rs
├── parsers/skill_md.rs

src/
├── pages/Skills.tsx
├── components/skills/
│   ├── SkillList.tsx
│   ├── SkillCard.tsx
│   ├── SkillViewer.tsx        # Full content modal
│   ├── MaturityBadge.tsx
│   └── ConflictWarning.tsx
```

## Test Plan

1. Create skills in various locations:
   - `~/.claude/skills/test-skill/SKILL.md`
   - `~/.agents/skills/another-skill/SKILL.md`
   - `~/.gemini/skills/gemini-skill/SKILL.md`
2. Launch Loadout → Skills tab
3. All skills appear with correct source/scope labels
4. Gemini skills show "Experimental" badge
5. Create same skill name in repo and user → see "shadowed" indicator
6. Create same skill name with different content in Claude and Codex → conflict warning
7. Click any skill → full content displays with highlighting

## Dependencies

- Issue 1: App Bootstrap (for workspace selection)

## Notes

- Key nuance: Codex uses `.agents/skills` for user-level but `.codex/skills` for repo
- Gemini skills require `experiments.agentSkills: true` — scanner should detect this
- For conflict detection, compare content hash not just names
