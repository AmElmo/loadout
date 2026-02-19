---
name: api-designer
description: Design RESTful API endpoints with OpenAPI schemas and implementation plan
metadata:
  role: architecture
  tags: [api, rest, openapi]
---
# API Designer

Given a feature description, design a complete API surface:

1. **Endpoints**: Define routes, methods, path parameters, query params
2. **Request/Response**: Write TypeScript interfaces for all bodies
3. **Validation**: Generate zod schemas for input validation
4. **Errors**: Define error codes and response formats
5. **Auth**: Specify required permissions and auth middleware
6. **OpenAPI**: Output an OpenAPI 3.1 YAML snippet for documentation

Follow REST conventions: plural nouns, HTTP semantics, proper status codes.
