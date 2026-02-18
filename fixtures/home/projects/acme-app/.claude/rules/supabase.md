---
paths:
  - "lib/supabase/**"
  - "app/api/**"
---
# Supabase Rules

- Always use the server-side Supabase client for mutations (never the anon client)
- Enable Row-Level Security on every new table — no exceptions
- Use `supabase.auth.getUser()` to verify auth, not `getSession()` (sessions can be stale)
- Write RLS policies that filter by `auth.uid()` or `org_id`
- Use database functions for complex multi-table operations
- Test RLS policies by querying as different user roles
