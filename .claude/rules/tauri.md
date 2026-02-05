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

## Error Handling

- Use `thiserror` crate for custom error types
- Implement `Display` and `Error` traits for serializable errors
- Frontend handles errors via `useQuery` from `@tanstack/react-query`

## Serde Patterns

- Use `#[serde(rename_all = "camelCase")]` to bridge Rust snake_case with JSON camelCase
- Use `#[serde(default)]` for optional fields or fields that might be missing
- Use `#[serde(skip_serializing_if = "Option::is_none")]` to omit None values

## Frontend Integration

- Import from `@tauri-apps/api` for core Tauri APIs
- Use plugins: `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-store`
- Create API wrappers in `src/lib/api/` for type-safe frontend-backend communication

## Common Mistakes

- Don't use Tauri 1.x config patterns (they changed significantly in 2.x)
- After installing Rust, run `source ~/.cargo/env` before using `cargo`
- Always run `pnpm tauri dev` from project root
- "No space left on device" during compilation: clean build artifacts with `cargo clean`
