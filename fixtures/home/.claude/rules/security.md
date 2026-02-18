---
paths:
  - "src/api/**"
  - "src/middleware/**"
  - "src/auth/**"
---
# Security Rules

- Always use parameterized queries — never concatenate user input into SQL
- Validate all request bodies with zod schemas before processing
- Use `helmet` middleware for HTTP security headers
- Rate-limit authentication endpoints (max 5 attempts per minute)
- Never log sensitive data: passwords, tokens, credit card numbers
- Use `bcrypt` with cost factor 12 for password hashing
- Set `HttpOnly`, `Secure`, and `SameSite=Strict` on all cookies
