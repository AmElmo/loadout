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
pnpm tauri dev           # Start development (both frontend and backend)
pnpm tauri:dev:fixtures  # Start dev with demo fixtures (uses LOADOUT_HOME)
pnpm build               # Build frontend only
pnpm tauri build         # Build full application
```

## Test Fixtures

`fixtures/home/` contains a realistic mock home directory with configurations for Claude, Codex, and Gemini (skills, rules, hooks, MCPs, and project-level settings). Use `pnpm tauri:dev:fixtures` to run the app against these fixtures instead of your real home directory. The `LOADOUT_HOME` env var is only honored in debug builds.

## Conventions

- Use `@` path alias for `src/` imports
- Use `cn()` utility (clsx + tailwind-merge) for conditional Tailwind classes
- Offload complex logic to Rust backend via Tauri commands
- State management: Zustand stores in `src/stores/`
- TypeScript interfaces in `src/types/index.ts` must mirror Rust structs for type safety
- Use `camelCase` for JSON/TypeScript, `snake_case` for Rust with `#[serde(rename_all = "camelCase")]`
- Mask sensitive environment variables with `***` in UI
- Use Conventional Commits (`feat:`, `fix:`, `chore:`)
- Branch names follow `type/LOA-ISSUE-description` format (see Branch Naming section)
- Version is tracked in 3 files that must stay in sync: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
- Releases are cut manually via `pnpm release [patch|minor|major]` — never auto-version
- Always include `<ToolLogo>` from `src/components/ToolLogo.tsx` next to AI tool names (Claude, Codex, Gemini) in the UI — in badges, filters, selectors, and tables. Keep logos small (10-14px) and use alongside text, never as sole identifier.

## Branch Naming

Use the format `type/LOA-ISSUE_NUMBER-short-description` for branches:
- `feat/LOA-42-add-updater` — new features
- `fix/LOA-57-version-mismatch` — bug fixes
- `chore/LOA-63-update-deps` — maintenance
- `refactor/LOA-71-simplify-scanner` — refactoring

The `type/` prefix must match the conventional commit type used in the PR merge commit. The `LOA-XX` identifier ensures Linear auto-links the branch to the issue.

## Releasing

### Flow

```
feature branches → PRs → main → pnpm release [patch|minor|major] → git push origin main --tags → CI builds → draft release → review & publish
```

### How to cut a release

1. Be on `main` with a clean working tree
2. Run the release script:
   ```bash
   pnpm release patch   # 0.1.0 → 0.1.1 (bug fixes)
   pnpm release minor   # 0.1.0 → 0.2.0 (new features)
   pnpm release major   # 0.1.0 → 1.0.0 (breaking changes)
   ```
   This bumps version in all 3 files, regenerates `Cargo.lock`, generates a `CHANGELOG.md` entry from conventional commits, and creates a commit + annotated tag.
3. Review the commit: `git log --oneline -1 && git diff HEAD~1`
4. Push: `git push origin main --tags`
5. Wait ~15-20 min for GitHub Actions to build all platforms
6. Go to [GitHub Releases](https://github.com/AmElmo/loadout/releases), review the draft, then publish

### What CI builds

| Platform | Artifacts |
|---|---|
| macOS (Apple Silicon) | `.dmg`, `.app.tar.gz` |
| macOS (Intel) | `.dmg`, `.app.tar.gz` |
| Linux (x86_64) | `.AppImage`, `.deb` |
| Windows (x86_64) | `.exe` (NSIS installer) |

### Auto-updates

Existing installations check for updates on launch (3s delay) and every 4 hours. When a new release is published, users see a toast notification with release notes and an "Update Now" button. The updater verifies cryptographic signatures before installing.

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Signs updater artifacts (from `~/.tauri/loadout.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |

### First-time setup (already done unless regenerating keys)

```bash
pnpm tauri signer generate -- -w ~/.tauri/loadout.key
```

Put the public key in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, and the private key + password in GitHub repo secrets.
