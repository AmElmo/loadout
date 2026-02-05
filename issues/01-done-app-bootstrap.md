# Issue 1: App Bootstrap + Workspace Selection

**Phase:** 1 (Read-Only MVP)
**Status:** Implemented

---

## Summary

Set up the Tauri + React foundation with workspace selection. Since Tauri apps have no meaningful `$CWD`, we need a folder picker so users can select which project to scan for project-scoped configs.

## Acceptance Criteria

- [x] Tauri 2.x + React 18 + TypeScript + Vite project initialized
- [x] shadcn/ui + Tailwind CSS configured
- [x] Zustand store + TanStack Query scaffolding
- [x] Navigation sidebar with tabs: **MCPs** (default), **Skills**, **Config**
- [x] "Select Workspace" folder picker (Tauri dialog plugin)
- [x] Repo root detection (walk up to find `.git`)
- [x] Recent workspaces list (persist last 5)
- [x] Current workspace indicator in header
- [x] Empty states for each tab
- [x] Tauri FS permissions configured for `~/.claude/`, `~/.codex/`, `~/.gemini/`, `~/.agents/`

## Prerequisites for Testing

- **Rust toolchain**: Requires `rustup` and `cargo` to be installed
  - Install via: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

## Technical Details

### Stack

| Component | Technology |
|-----------|------------|
| Framework | Tauri 2.x |
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Data Fetching | TanStack Query v5 |
| Package Manager | pnpm |

### Workspace State

```typescript
interface WorkspaceState {
  current: string | null;       // selected folder path
  repoRoot: string | null;      // detected .git parent
  recent: string[];             // last 5 workspaces
}
```

### Repo Root Detection (Rust)

```rust
fn find_repo_root(path: &Path) -> Option<PathBuf> {
    let mut current = path.to_path_buf();
    loop {
        if current.join(".git").exists() {
            return Some(current);
        }
        if !current.pop() { return None; }
    }
}
```

### Tauri Capabilities

Configure `src-tauri/capabilities/default.json` for FS access:

**Static paths (always needed):**
- `$HOME/.claude/**`, `$HOME/.claude.json`
- `$HOME/.codex/**`
- `$HOME/.agents/**`
- `$HOME/.gemini/**`

**Dynamic paths (project-dependent):**
- `$PROJECT_ROOT/**` — for project-scoped configs (`.claude/`, `.codex/`, `.gemini/`, `.mcp.json`, `AGENTS.md`)

**Runtime permission**: When user selects a workspace, the app requests filesystem access to the resolved project root. Use Tauri's scoped filesystem plugin or dialog-based folder access grant.

### Project Path Resolution

When workspace is selected:
1. Find repo root (walk up to `.git`)
2. If `.git` found: `$PROJECT_ROOT` = repo root
3. If no `.git` found: `$PROJECT_ROOT` = selected folder

**All project-scoped scans use `$PROJECT_ROOT`** — this ensures `.codex/skills/` and `.claude/` are found even if user selects a subfolder within a repo.

### Project Structure

```
loadout/
├── src/                        # React frontend
│   ├── App.tsx
│   ├── components/ui/          # shadcn components
│   ├── pages/
│   │   ├── MCPs.tsx
│   │   ├── Skills.tsx
│   │   └── Config.tsx
│   ├── stores/
│   │   └── workspaceStore.ts
│   └── lib/api/                # Tauri IPC wrapper
├── src-tauri/                  # Rust backend
│   ├── capabilities/
│   ├── src/
│   │   ├── lib.rs
│   │   └── workspace.rs
│   └── Cargo.toml
├── package.json
└── tauri.conf.json
```

## Test Plan

1. Run `pnpm tauri dev`
2. App window opens with Loadout branding
3. Sidebar shows MCPs, Skills, Config tabs
4. MCPs tab selected by default
5. Click "Select Workspace" → native folder picker opens
6. Select a git repo → repo root detected, shown in header
7. Workspace appears in "Recent" dropdown
8. Switch between recent workspaces
9. No console errors

## Dependencies

None (first issue)

## Notes

- MCPs tab is default per spec: "fewer items, health checks give immediate visual feedback"
- "Config" tab will contain: system prompts, hooks, experiment flags, reality panel
