<p align="center">
  <img src="brand-assets/svg/readme-hero-v2.svg" alt="Loadout — Gear up your AI tools" width="720" />
</p>

---

Loadout scans, views, and manages configuration for your AI coding assistants — Claude, Codex, Gemini, Cursor, Copilot, and more — from a single desktop app.

## Features

- Scan your home directory and workspaces for AI tool configs
- View and manage MCPs, skills, rules, hooks, and context files
- Support for Claude, Codex, Gemini, Cursor, Copilot, Windsurf, Roo, Cline, Kilo, and OpenCode
- Project-level and global configuration management

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Zustand, TanStack Query
- **Backend**: Rust, Tauri 2.x
- **Package Manager**: pnpm

## Getting Started

```bash
pnpm install
pnpm tauri dev
```

To run against demo fixtures instead of your real home directory:

```bash
pnpm tauri:dev:fixtures
```

## Building

```bash
pnpm tauri build
```

## License

MIT
