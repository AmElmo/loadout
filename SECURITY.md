# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Loadout, please report it responsibly.

**Email:** [security@loadout.dev](mailto:security@loadout.dev)

Please do **not** open a public GitHub issue for security vulnerabilities.

We will acknowledge your report within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues.

## Security Model

Loadout is a desktop application that reads and writes AI CLI configuration files. Its trust model mirrors the tools it manages (Claude Code, Codex CLI, Gemini CLI, etc.):

- **User config files are trusted.** Loadout reads `~/.claude.json`, `~/.codex/config.toml`, `~/.gemini/settings.json`, and similar files. These are user-owned and user-editable, same as the AI CLIs themselves.
- **Project-level configs are read.** Files like `.mcp.json` in cloned repositories are parsed. MCP commands declared in these files can be executed via health check — this is the same trust model as Claude Code.
- **Environment variable values are masked.** Env vars from MCP configs are masked with `***` before reaching the frontend. Unmasked values stay in the Rust backend and are only used for MCP health checks and tool fetching.
- **Header interpolation is scoped.** `${VAR}` references in HTTP MCP headers are only resolved against env vars declared in that MCP's own `env` block — not the full system environment.
- **Writes use atomic operations.** Config file modifications use write-to-temp-then-rename to prevent corruption. Automatic backups are created before every write.
- **Path access is restricted.** The file manager reveal command validates that paths are within known AI config directories or discovered workspaces.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

Only the latest release receives security patches.
