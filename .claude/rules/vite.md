# Vite Configuration Rules

## Tauri Integration

- Include `tailwindcss()` in Vite plugins if using Tailwind
- Add `resolve.alias` for `@` → `src/` path alias
- Set `server.watch.ignored` to exclude `src-tauri/` (prevents conflicts)
- Set `envPrefix` to include `TAURI_` for Tauri env vars

## Build Targets

- Windows: `chrome105`
- macOS/Linux: `safari13`

## ESLint

- Exporting both components and shared constants (like `buttonVariants`) from the same file breaks React Fast Refresh
- Move shared constants to separate files when this warning appears
