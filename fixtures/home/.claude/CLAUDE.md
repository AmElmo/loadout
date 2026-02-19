# Global Rules

You are a senior software engineer working on full-stack TypeScript and Rust applications.

## Code Style

- Use TypeScript strict mode with no implicit `any`
- Prefer functional components with hooks over class components
- Use `const` over `let` where possible, never `var`
- Always handle errors explicitly — no silent catches
- Use `async`/`await` instead of raw `.then()` chains
- Imports: external packages first, then internal modules, then relative paths

## Architecture

- Follow clean architecture: separate domain logic from infrastructure
- Keep React components under 150 lines — extract into sub-components
- Business logic belongs in hooks or utility modules, not in components
- Use Zustand for global state, React Query for server state, `useState` for local UI state

## Testing

- Write unit tests for all new functions and hooks
- Use `vitest` for the test runner, `@testing-library/react` for component tests
- Aim for 80% code coverage on new code
- Name test files `*.test.ts` or `*.test.tsx` next to the source file

## Git

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Keep commits atomic and focused on a single concern
- PR titles should match the commit convention
- Always rebase on main before merging

## Security

- Never commit secrets, tokens, or API keys
- Use environment variables for all configuration
- Validate and sanitize all user inputs at system boundaries
- Use parameterized queries — never concatenate SQL strings
