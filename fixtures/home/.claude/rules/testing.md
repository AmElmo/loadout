---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
---
# Testing Rules

- Use `describe` / `it` blocks — `describe` groups by unit, `it` describes behavior
- Prefer `toEqual` over `toBe` for objects and arrays
- Mock external dependencies (`fetch`, APIs), not internal modules
- Each test should test exactly one behavior — no multi-assert mega-tests
- Use `beforeEach` for shared setup, but prefer inline setup for clarity when possible
- Name tests as sentences: `it("throws when user is not authenticated")`
- For async tests, always `await` the assertion — never return a raw Promise
- Use `vi.useFakeTimers()` for time-dependent logic, reset in `afterEach`
