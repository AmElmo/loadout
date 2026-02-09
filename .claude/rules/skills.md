# Skills Configuration Rules

## Skill File Format

Skills are defined by `SKILL.md` files in project directories. Two formats are supported:

### YAML Frontmatter (preferred for rich metadata)
```markdown
---
name: My Skill
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

## Scanner Logic

- Recursively scan directories using `walkdir` for `SKILL.md` files
- Generate unique IDs by hashing the skill name with `skill_` prefix
- Distinguish between user-level and project-level skills (same as MCPs)

## Frontend Patterns

- Reuse the same component patterns as MCPs (`SkillCard`, `SkillList`)
- Feature components in `src/components/skills/` with barrel export via `index.ts`
- API wrapper in `src/lib/api/skills.ts`
