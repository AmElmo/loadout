---
name: migration-helper
description: Generate database migration files and rollback scripts
metadata:
  role: backend
  tags: [database, migrations, drizzle]
---
# Migration Helper

Given a schema change description, generate:

1. **Forward migration**: SQL or Drizzle migration file to apply the change
2. **Rollback script**: Reverse migration to undo the change safely
3. **Data migration**: If existing rows need transformation, generate a safe script
4. **Validation**: Queries to verify the migration succeeded
5. **Checklist**: Pre-deploy and post-deploy verification steps

Always prefer additive changes (add column with default) over destructive ones (drop column).
Never generate migrations that lock tables for extended periods.
