# Skills Configuration Rules

## Skill File Format

Skills are defined by `SKILL.md` files in project directories. Two formats are supported:

### YAML Frontmatter (preferred for rich metadata)
```markdown
---
name: my-skill
description: What this skill does
metadata:
  key: value
---
# Content here
```

### Plain Markdown (fallback)
```markdown
# Skill Title
Description and instructions...
```

- For plain markdown, derive the skill name from the **parent directory name**
- Derive the description from the **first meaningful line of content**
- Parser must support both formats - never silently fail on valid plain markdown

## Skill Naming Rules

- The `name` field in frontmatter **must exactly match** its parent directory name (e.g., `skills/my-skill/SKILL.md` → `name: my-skill`)
- Names: 1-64 lowercase alphanumeric characters and hyphens only
- Cannot start or end with a hyphen, no consecutive hyphens
- This name is used for `/slash-commands`

## Directory Structure

- **Flat structure required**: Skills must be at `skills/<name>/SKILL.md` (depth 2), not nested deeper
- Nesting (e.g., `skills/role/sub-skill/SKILL.md`) is not standard and won't be discovered
- For role-based organization, use an **orchestrator skill** (e.g., `skills/software-engineer/SKILL.md`) that references other standalone skills in its instructions
- Avoid prefixing skill names with roles (e.g., don't use `se-agent-browser`) to maintain reusability

## Claude Code Legacy Commands

- Claude Code merges "commands" and "skills" — they function identically
- Commands live at `.claude/commands/<name>.md` (depth 1, plain `.md` files)
- Skills live at `.claude/skills/<name>/SKILL.md` (depth 2)
- Command names are derived from filenames (e.g., `review.md` → `review`)
- Both are exposed as `/slash-commands`

## Scanner Logic

- Scan `SKILL.md` files at **2-level depth** (e.g., `skills/<name>/SKILL.md`)
- Scan `*.md` files at **1-level depth** for Claude Code legacy commands (e.g., `commands/<name>.md`)
- Derive names from directory names (for `SKILL.md`) or filenames (for `*.md`)
- Generate unique IDs by hashing the skill name with `skill_` prefix
- Distinguish between user-level and project-level skills (same as MCPs)
- Detect conflicts (same name, different content) and shadowing (project-level shadows user-level for the same tool)

## Metadata Field

- The `metadata` field in `SKILL.md` frontmatter is for **client-side tooling only** (e.g., Loadout's UI for filtering/grouping)
- Agents do **not** use `metadata` for discovery or routing — they only use `name` and `description`
- Do not rely on `metadata.role` or similar for agent-side skill organization

## Frontend Patterns

- Reuse the same component patterns as MCPs (`SkillCard`, `SkillList`)
- Feature components in `src/components/skills/` with barrel export via `index.ts`
- API wrapper in `src/lib/api/skills.ts`
- Update empty state messages in `SkillList.tsx` when skill discovery logic changes
