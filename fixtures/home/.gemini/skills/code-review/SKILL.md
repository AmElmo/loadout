---
name: code-review
description: Review code for bugs, security issues, and best practices
metadata:
  role: engineering
  tags: [review, quality, best-practices]
---
# Code Review

Perform a thorough code review on the provided diff or file:

1. **Correctness**: Logic errors, off-by-one bugs, null/undefined handling, race conditions
2. **Security**: Injection vulnerabilities, XSS, auth bypasses, data exposure
3. **Performance**: N+1 queries, unnecessary re-renders, memory leaks, missing memoization
4. **Standards**: Adherence to project conventions, naming, file organization
5. **Tests**: Coverage gaps, missing edge cases, brittle assertions
6. **Types**: TypeScript strictness — any `any`, missing generics, loose return types

## Output Format

For each finding:
- **Severity**: CRITICAL | WARNING | SUGGESTION | NITPICK
- **Location**: file:line
- **Issue**: What's wrong
- **Fix**: How to resolve it (with code snippet)

End with a summary verdict: APPROVE, REQUEST CHANGES, or COMMENT.
