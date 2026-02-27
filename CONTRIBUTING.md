# Contributing to Loadout

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

**Prerequisites:** Node.js 20+, pnpm, Rust stable, and [Tauri 2.x prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
pnpm install
pnpm tauri dev
```

To run against demo fixtures instead of your real home directory:

```bash
pnpm tauri:dev:fixtures
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm build` to check the frontend
4. Run `cargo clippy` and `cargo test` in `src-tauri/` to check the backend
5. Open a pull request

## Conventions

- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
- **Frontend:** TypeScript with React, Tailwind CSS, Zustand for state. Use `@` path alias for `src/` imports and `cn()` for conditional classes.
- **Backend:** Rust with Tauri 2.x. Use `snake_case` with `#[serde(rename_all = "camelCase")]` for JSON serialization.
- **Types:** TypeScript interfaces in `src/types/index.ts` must mirror their Rust struct counterparts.

## Reporting Bugs

Open a [GitHub issue](https://github.com/AmElmo/loadout/issues) with steps to reproduce.

## Security

Please report security vulnerabilities via email — see [SECURITY.md](SECURITY.md) for details.
