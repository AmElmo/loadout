# Loadout

A Tauri 2.x desktop application with React + Vite frontend.

## Project Structure

- `src/` - React frontend (Vite)
- `src-tauri/` - Rust backend (Tauri 2.x)
- `issues/` - Task breakdown and specs

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
