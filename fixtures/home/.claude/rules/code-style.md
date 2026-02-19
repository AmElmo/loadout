---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Code Style Rules

- Use 2-space indentation throughout
- Prefer named exports over default exports
- Use `interface` for object shapes, `type` for unions and intersections
- Avoid `any` — use `unknown` and narrow with type guards
- Max line length: 100 characters (120 for strings and templates)
- One component per file — name the file after the component
- Order imports: external packages, then `@/` aliases, then relative paths
- Destructure props in function signature: `function Button({ label, onClick }: ButtonProps)`
- Use `satisfies` for type-safe object literals: `const config = { ... } satisfies Config`
