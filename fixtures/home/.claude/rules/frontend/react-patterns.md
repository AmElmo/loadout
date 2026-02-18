---
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/hooks/**"
---
# React Patterns

- Use named exports for components: `export function Button()` not `export default`
- Colocate styles, tests, and types with the component file
- Extract reusable logic into custom hooks prefixed with `use`
- Use `React.memo` only when profiling shows re-render issues — don't premature optimize
- Prefer `children` prop over render props for composition
- Keep `useEffect` dependencies minimal — split complex effects into multiple smaller ones
- Use `ErrorBoundary` components at route boundaries
