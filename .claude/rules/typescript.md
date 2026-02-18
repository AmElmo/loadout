---
paths:
  - "src/**/*.{ts,tsx}"
---

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
- Organize by feature: `src/components/{feature}/` (e.g., `mcps/`, `skills/`)
- Use `index.ts` barrel exports in each feature directory
- Prefer composition over large monolithic components
- Use `cn()` for conditional Tailwind classes
- Follow consistent patterns across features (e.g., `Card`, `List` components)

## UI Patterns

- Use `useEffect` with `mousedown` listeners to close dropdowns/modals on outside click
- Normalize paths for display: replace `/Users/username/` with `~/`
- Use `staleTime` in `react-query` to prevent unnecessary re-scans and improve responsiveness

## UX Principles

- Show data as soon as available (don't block on secondary selections)
- Clear visual distinction between scopes (user-level vs project-level)
- Icons and avatars enhance UI intuitiveness
- Mask sensitive data (env vars, tokens) with `***`
- Use plain language — avoid jargon (e.g., "Detected Reality" was confusing, removed)
- Prefer dedicated pages for distinct feature sets over catch-all pages
- Provide informative empty states with guidance on how to create items
- Collapse or summarize long technical lists (raw file paths, IDs) — don't overwhelm users
