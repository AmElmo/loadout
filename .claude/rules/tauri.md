# Tauri 2.x Rules

## Configuration

- **File system scopes**: Configure in `src-tauri/capabilities/default.json`, NOT in `tauri.conf.json`
  - `plugins.fs.scope` in `tauri.conf.json` is INVALID in Tauri 2.x
- `devUrl` must match Vite dev server port (default: `http://localhost:5173`)
- `beforeDevCommand` and `beforeBuildCommand` integrate frontend builds

## Rust Commands

- Use `#[tauri::command]` to expose functions to frontend
- Return `Result<T, String>` or custom serializable error types
- Entry point: `src-tauri/src/lib.rs` contains `run()` function
- `src-tauri/src/main.rs` calls `app_lib::run()`

## Frontend Integration

- Import from `@tauri-apps/api` for core Tauri APIs
- Use plugins: `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-store`

## Common Mistakes

- Don't use Tauri 1.x config patterns (they changed significantly in 2.x)
- After installing Rust, run `source ~/.cargo/env` before using `cargo`
- Always run `pnpm tauri dev` from project root
