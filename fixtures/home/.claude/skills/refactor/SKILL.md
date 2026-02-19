---
name: refactor
description: Refactor code to improve readability, performance, and maintainability
metadata:
  role: engineering
  tags: [code-quality, maintenance]
---
# Refactor

Analyze the provided code and refactor it following these principles:

1. **Extract**: Pull repeated patterns into shared functions or hooks
2. **Simplify**: Reduce nesting, flatten conditionals, use early returns
3. **Name**: Rename unclear variables and functions to express intent
4. **Type**: Tighten TypeScript types — eliminate `any`, use discriminated unions
5. **Split**: Break files over 200 lines into focused modules

Always preserve existing behavior — verify with the test suite before and after.
Output a before/after comparison with explanations for each change.
