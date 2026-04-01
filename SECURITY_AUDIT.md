# Security Audit Checklist

> Periodic audit guide for Loadout — a Tauri 2.x desktop app (Rust backend + React/Vite frontend).
> Run through this checklist before each release or whenever security-sensitive code changes.

---

## Risk #1 — IPC Command Injection & Unauthorized Invocation

**Why it matters:** Tauri exposes Rust functions to the webview via IPC. If an attacker injects JS into the webview (via XSS or a compromised dependency), they can call any permitted Tauri command with arbitrary arguments.

**What to check:**

- [ ] Every `#[tauri::command]` validates its inputs server-side (Rust) — never trust frontend-only validation
- [ ] No command accepts raw file paths without normalizing and validating against allowed scopes
- [ ] Commands that write files (`save_file_content`, `save_skill_content`) reject paths outside known config directories
- [ ] `reveal_in_file_manager` still normalizes `..` sequences and rejects escape attempts
- [ ] No new commands accept user-controlled strings passed directly to `Command::new()` or `.arg()`
- [ ] The command list in `lib.rs` → `invoke_handler` hasn't grown without review

**Files to audit:**
- `src-tauri/src/commands/*.rs` — all command handlers
- `src-tauri/src/lib.rs` — `invoke_handler` registration
- `src-tauri/src/writers/atomic.rs` — write path validation

---

## Risk #2 — Path Traversal in File System Operations

**Why it matters:** The app reads and writes AI tool config files. A crafted path (`../../.ssh/id_rsa`) could escape the allowed scope and access or overwrite arbitrary files.

**What to check:**

- [ ] All file read/write operations canonicalize paths before use (resolve symlinks, normalize `..`)
- [ ] Symlink resolution happens *before* scope validation (TOCTOU: check-then-use race)
- [ ] `walkdir` scanners skip symlinks (`follow_links(false)`) to prevent symlink-based escapes
- [ ] Tauri FS plugin scope in `capabilities/default.json` hasn't been widened beyond AI config dirs
- [ ] No command constructs paths by concatenating user input without validation
- [ ] Backup directory (`~/.loadout/backups/`) uses hash-based filenames, not user-controlled names

**Files to audit:**
- `src-tauri/capabilities/default.json` — FS scope declarations
- `src-tauri/src/commands/system.rs` — `reveal_in_file_manager` path validation
- `src-tauri/src/writers/atomic.rs` — write target validation
- `src-tauri/src/scanners/workspaces.rs` — walkdir configuration

---

## Risk #3 — Supply Chain Attacks via Dependencies

**Why it matters:** Desktop apps ship bundled dependencies to thousands of machines. A compromised npm or crates.io package becomes a local code execution vector with full user privileges.

**What to check:**

- [ ] Run `pnpm audit` — zero critical/high vulnerabilities
- [ ] Run `cargo audit` — zero known advisories (install via `cargo install cargo-audit`)
- [ ] Review `pnpm-lock.yaml` and `Cargo.lock` for unexpected new transitive dependencies after updates
- [ ] No `postinstall` scripts in npm dependencies that execute arbitrary code
- [ ] Tauri plugins are pinned to major version (`"2"`) — verify no yanked or compromised versions
- [ ] `reqwest` still uses `rustls-tls` feature (not `native-tls` which depends on OpenSSL)
- [ ] No new `build.rs` files in dependencies that download or execute binaries at build time

**Files to audit:**
- `package.json` / `pnpm-lock.yaml` — JS dependencies
- `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` — Rust dependencies

**Automation:**
```bash
pnpm audit
cargo audit                          # requires: cargo install cargo-audit
cargo tree --duplicates              # check for suspicious duplicate crates
```

---

## Risk #4 — Sensitive Data Leakage (API Keys, Tokens, Env Vars)

**Why it matters:** The app reads MCP configs containing API keys and OAuth tokens. Leaking these to the frontend, logs, or crash reports exposes user credentials.

**What to check:**

- [ ] `mask_env_values()` is called on all env vars before they reach the frontend
- [ ] HTTP headers in MCP configs are masked before IPC serialization
- [ ] Real (unmasked) env vars are only read at point-of-use (health checks, tool fetch) — never cached in frontend state
- [ ] macOS Keychain reads (`security-framework`) don't log token values
- [ ] Tauri store (`tauri-plugin-store`) doesn't persist any secrets — only UI preferences
- [ ] No secrets in `console.log`, `tracing::info!`, or `tracing::debug!` statements
- [ ] `.env` files are in `.gitignore`
- [ ] Crash/panic handlers don't include environment variable dumps

**Files to audit:**
- `src-tauri/src/scanners/mcps.rs` — `mask_env_values`, env var handling
- `src-tauri/src/commands/mcps.rs` — health check & tool fetch (where real vars are used)
- `src-tauri/src/scanners/auth.rs` — Keychain access
- `src/stores/*.ts` — Zustand stores (ensure no secrets in state)

---

## Risk #5 — External Process Execution & Command Injection

**Why it matters:** The app spawns external processes (git, file manager, MCP stdio servers). If user-controlled data flows into process arguments without sanitization, it enables command injection.

**What to check:**

- [ ] All `Command::new()` calls use hardcoded binary names — never user-supplied strings
- [ ] Arguments are passed via `.arg()` (safe) not via shell interpolation (unsafe)
- [ ] No use of `std::process::Command::new("sh")` or `Command::new("cmd")` with `-c` flag
- [ ] MCP stdio server commands come from parsed config files, not raw user input
- [ ] MCP `args` arrays are passed as individual `.arg()` calls, not joined into a shell string
- [ ] Git commands are limited to read-only operations (`log`, `rev-list`, `branch`) with timeouts
- [ ] Process timeouts exist for all spawned processes (currently: 2s git, 5s health, 10s tools)
- [ ] No new `Command::new()` calls have been added without review

**Files to audit:**
- `src-tauri/src/commands/mcps.rs` — MCP process spawning
- `src-tauri/src/scanners/repos.rs` — git command execution
- `src-tauri/src/commands/system.rs` — file manager reveal
- `src-tauri/src/commands/tools.rs` — tool detection (`which` calls)

---

## Risk #6 — Auto-Updater Compromise (Update Hijacking)

**Why it matters:** The updater downloads and installs executable code. If the update channel, signature verification, or endpoint is compromised, an attacker can push malicious updates to all users.

**What to check:**

- [ ] `plugins.updater.pubkey` in `tauri.conf.json` matches the expected minisign public key
- [ ] Update endpoint uses HTTPS (`https://github.com/AmElmo/loadout/releases/...`)
- [ ] Signature verification is mandatory (Tauri default — ensure no `dangerousInsecureTransportProtocol`)
- [ ] `TAURI_SIGNING_PRIVATE_KEY` is stored only in GitHub Secrets — never committed
- [ ] GitHub Actions workflow pins action versions by SHA (not mutable tags like `@v3`)
- [ ] CI workflow hasn't been modified to skip signing or inject extra build steps
- [ ] Release artifacts are built only from `main` branch in CI — no manual uploads
- [ ] Draft releases require manual publish (human review gate)

**Files to audit:**
- `src-tauri/tauri.conf.json` — updater config, pubkey, endpoints
- `.github/workflows/*.yml` — CI/CD pipeline integrity
- GitHub repo settings — branch protection rules on `main`

---

## Risk #7 — Cross-Site Scripting (XSS) in the Webview

**Why it matters:** Tauri's frontend runs in a webview. XSS in a desktop app is worse than in a browser — the attacker gains access to all IPC commands and local file operations permitted by the app.

**What to check:**

- [ ] CSP in `tauri.conf.json` restricts `script-src` to `'self'` (no `'unsafe-eval'`, no `'unsafe-inline'` for scripts)
- [ ] CSP `default-src` is `'self'` — no external resource loading
- [ ] No use of `dangerouslySetInnerHTML` in React components
- [ ] No `eval()`, `new Function()`, or `document.write()` in frontend code
- [ ] User-supplied text (file names, MCP names, config values) rendered via React JSX (auto-escaped) not raw HTML
- [ ] Markdown/rich-text rendering (if any) uses a sanitizer
- [ ] External URLs opened with `shell.open()` not loaded inside the webview
- [ ] `tauri.conf.json` → `withGlobalTauri` is `false` (prevents `window.__TAURI__` exposure)

**Files to audit:**
- `src-tauri/tauri.conf.json` — CSP, security settings
- `src/components/*.tsx` — all UI components rendering dynamic data
- `src/lib/` — any HTML string construction

**Automation:**
```bash
# Search for dangerous patterns in frontend
rg 'dangerouslySetInnerHTML|\.innerHTML|eval\(|new Function|document\.write' src/
```

---

## Risk #8 — MCP Server Trust & Network Security

**Why it matters:** Users configure MCP servers (stdio and HTTP) that the app communicates with. A malicious or compromised MCP server could return crafted responses to exploit parsing, exfiltrate data, or cause denial of service.

**What to check:**

- [ ] JSON-RPC responses from MCP servers are validated against expected schema before use
- [ ] HTTP MCP URLs are restricted to HTTPS (or at minimum, warn on plain HTTP)
- [ ] Response size limits exist to prevent memory exhaustion from oversized responses
- [ ] Timeouts are enforced on all MCP network requests (currently 5s health, 10s tools)
- [ ] MCP stdio server stdout/stderr is bounded (won't fill memory with infinite output)
- [ ] Error messages from MCP servers are sanitized before display in UI (no HTML injection)
- [ ] No MCP response data is passed to `eval()` or interpreted as code
- [ ] SSE/streaming endpoints (if added) have connection timeouts and message size limits

**Files to audit:**
- `src-tauri/src/commands/mcps.rs` — MCP communication logic
- `src-tauri/src/parsers/` — config file parsers (could be fed crafted files)

---

## Risk #9 — Insecure Local Storage & State Persistence

**Why it matters:** `tauri-plugin-store` persists data to disk in plaintext JSON. If secrets accidentally end up in the store, they're readable by any process with access to the user's profile.

**What to check:**

- [ ] Tauri store (`plugin-store`) contains only UI preferences — never API keys, tokens, or passwords
- [ ] Zustand stores with `persist` middleware don't serialize sensitive fields
- [ ] `localStorage`/`sessionStorage` not used for sensitive data
- [ ] Store file location (`~/.loadout/` or app data dir) has appropriate file permissions
- [ ] No sensitive data in Tauri's `app_log_dir` log files
- [ ] Backup files in `~/.loadout/backups/` don't contain secrets in filenames or metadata
- [ ] Old backup cleanup works correctly (max 10 per file, 30-day expiry)

**Files to audit:**
- `src/stores/*.ts` — Zustand stores, check `persist` config
- `src-tauri/src/writers/atomic.rs` — backup file handling
- App data directory on disk (inspect actual stored files)

---

## Risk #10 — Denial of Service via Resource Exhaustion

**Why it matters:** Desktop apps share system resources with the user's other work. Unbounded scanning, large file parsing, or runaway processes can freeze the app or the entire machine.

**What to check:**

- [ ] Workspace scanning has depth limits (`max_depth: 4`) and directory pruning (34 excluded dirs)
- [ ] File reads have size limits — don't read multi-GB files into memory
- [ ] Config file parsers reject files above a reasonable size threshold
- [ ] `walkdir` traversal skips symlinks to prevent infinite loops
- [ ] All spawned processes have timeouts (git: 2s, MCP health: 5s, MCP tools: 10s)
- [ ] No unbounded `Vec` growth from parsing untrusted input
- [ ] TanStack Query has reasonable `staleTime`/`refetchInterval` — no accidental polling storms
- [ ] Concurrent MCP health checks are bounded (not N*M parallel spawns)

**Files to audit:**
- `src-tauri/src/scanners/workspaces.rs` — scan depth & pruning
- `src-tauri/src/commands/mcps.rs` — concurrent process limits
- `src/lib/api/*.ts` — query configuration

---

## How to Run This Audit

### Quick automated checks

```bash
# 1. Dependency vulnerabilities
pnpm audit
cargo audit

# 2. Dangerous frontend patterns
rg 'dangerouslySetInnerHTML|\.innerHTML|eval\(|new Function|document\.write' src/
rg 'unsafe-eval|unsafe-inline' src-tauri/tauri.conf.json

# 3. Unsafe Rust code
rg 'unsafe\s*\{' src-tauri/src/

# 4. Hardcoded secrets
rg -i 'password|secret|token|api.key' --type rust --type ts -g '!*.lock' -g '!SECURITY_AUDIT.md'

# 5. Shell execution patterns
rg 'Command::new\(' src-tauri/src/

# 6. New IPC commands since last audit
rg '#\[tauri::command\]' src-tauri/src/

# 7. FS scope changes
cat src-tauri/capabilities/default.json | grep -A 50 '"scope"'
```

### Manual review cadence

| Trigger | Sections to review |
|---|---|
| New Tauri command added | #1, #2, #5 |
| Dependency update | #3 |
| MCP feature changes | #4, #5, #8 |
| CI/CD workflow changes | #6 |
| New UI component with dynamic data | #7 |
| Release candidate | All sections |

---

*Last updated: 2026-04-01*
