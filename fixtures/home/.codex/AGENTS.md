# Codex Global Rules

You are working on a Node.js + TypeScript backend powering a SaaS platform.

## Guidelines

- Use ES modules (`import`/`export`) exclusively — no `require()`
- Handle all Promise rejections with proper error types
- Use structured logging with `pino` — never use `console.log` in production code
- Follow REST API naming conventions: plural nouns, kebab-case paths
- Always validate request inputs with `zod` schemas at the route handler level

## Database

- Use Drizzle ORM for all database interactions
- Write migrations for every schema change — never modify tables directly
- Include `created_at` and `updated_at` timestamps on all tables
- Use transactions for multi-step operations

## Error Handling

- Define custom error classes that extend `AppError`
- Return consistent error responses: `{ error: { code, message, details? } }`
- Log errors with correlation IDs for traceability
- Never expose stack traces to clients

## Performance

- Use connection pooling for database connections
- Add Redis caching for expensive queries (TTL: 5 minutes default)
- Paginate all list endpoints — max 100 items per page
- Use `Promise.all` for independent async operations
