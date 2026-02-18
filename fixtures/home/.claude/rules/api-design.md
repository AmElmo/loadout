---
paths:
  - "src/api/**"
  - "src/routes/**"
---
# API Design Rules

- Use plural nouns for resource paths: `/users`, not `/user`
- Return 201 for resource creation, 204 for deletions
- Include `Link` headers for pagination with `rel="next"` and `rel="prev"`
- Version APIs via URL prefix: `/v1/users`
- Use `PATCH` for partial updates, `PUT` for full replacements
- Always return `Content-Type: application/json` with proper charset
- Include request ID in response headers: `X-Request-Id`
