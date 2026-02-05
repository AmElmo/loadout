# Loadout

A Tauri 2.x desktop application with React + Vite frontend.

## Project Structure

- `src/` - React frontend (Vite)
  - `src/components/` - React UI components
  - `src/lib/api/` - Frontend-backend communication wrappers (e.g., `mcps.ts`)
  - `src/stores/` - Zustand state management stores
  - `src/types/` - TypeScript interfaces (mirror Rust structs)
- `src-tauri/` - Rust backend (Tauri 2.x)
  - `src-tauri/src/commands/` - Tauri command handlers
  - `src-tauri/src/parsers/` - Configuration file parsers
  - `src-tauri/src/scanners/` - File system scanners
- `issues/` - Task breakdown and specs with Acceptance Criteria, Technical Details, and Test Plans

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Zustand, TanStack Query
- **Backend**: Rust, Tauri 2.x
- **Package Manager**: pnpm

## Key Commands

```bash
pnpm tauri dev    # Start development (both frontend and backend)
pnpm build        # Build frontend only
pnpm tauri build  # Build full application
```

## Conventions

- Use `@` path alias for `src/` imports
- Use `cn()` utility (clsx + tailwind-merge) for conditional Tailwind classes
- Offload complex logic to Rust backend via Tauri commands
- State management: Zustand stores in `src/stores/`
- TypeScript interfaces in `src/types/index.ts` must mirror Rust structs for type safety
- Use `camelCase` for JSON/TypeScript, `snake_case` for Rust with `#[serde(rename_all = "camelCase")]`
- Mask sensitive environment variables with `***` in UI
- Use Conventional Commits (`feat:`, `fix:`, `chore:`)
