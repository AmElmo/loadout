---
name: test-writer
description: Generate comprehensive unit tests with edge cases and mocks
metadata:
  role: engineering
  tags: [testing, vitest, unit-tests]
---
# Test Writer

Given a function, hook, or module, generate comprehensive unit tests:

1. **Happy path**: Normal usage with expected inputs and outputs
2. **Edge cases**: Empty inputs, boundary values, max/min, unicode, null/undefined
3. **Error paths**: Invalid inputs, network failures, timeout scenarios
4. **Async behavior**: Promise resolution, rejection, loading states
5. **Integration**: How the unit interacts with its direct dependencies

## Rules

- Use `vitest` with `describe` / `it` blocks
- Mock external dependencies with `vi.mock()` — never mock the unit under test
- Use `@testing-library/react` and `renderHook()` for React hooks
- Each test should verify exactly one behavior
- Use descriptive test names: `it("returns empty array when input is null")`
- Include setup/teardown in `beforeEach`/`afterEach` when shared across tests
- Aim for 90%+ branch coverage on the unit under test
