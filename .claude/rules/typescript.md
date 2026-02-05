# TypeScript & Frontend Rules

## Type Definitions

- Define interfaces in `src/types/index.ts`
- Mirror Rust structs for consistent data handling (e.g., `MCPItem`, `WorkspaceInfo`)
- Use explicit types rather than `any` for better DX and error prevention

## API Wrappers

- Place Tauri command wrappers in `src/lib/api/` (e.g., `mcps.ts`)
- Wrap `invoke()` calls with typed functions
- Handle errors consistently across wrappers

## Data Fetching

- Use `@tanstack/react-query` for server state management
- `useQuery` for data fetching with automatic caching and error handling
- Consistent query key naming convention

## Component Organization

- UI components in `src/components/`
- Prefer composition over large monolithic components
- Use `cn()` for conditional Tailwind classes

## UX Principles

- Show data as soon as available (don't block on secondary selections)
- Clear visual distinction between scopes (user-level vs project-level)
- Icons and avatars enhance UI intuitiveness
- Mask sensitive data (env vars, tokens) with `***`
