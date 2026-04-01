# AI Tools Documentation Reference

> **Purpose**: Quick-lookup table mapping every AI tool and concept Loadout supports to its official documentation. Agents working on scanners, parsers, or fixtures should consult these links — and verify against live docs — before making changes.
>
> **Last full review**: 2026-04-01

## How to use this file

1. Find the tool + concept you're working on in the tables below.
2. Open the linked documentation to verify current config format, field names, and behavior.
3. If a link is dead or the docs have changed significantly, update the URL and `Last Verified` date.
4. For the most up-to-date information, also use `context7` MCP or web search — these URLs are starting points, not ground truth.

---

## Tools Overview

| Tool | Docs Root | Config Format |
|------|-----------|---------------|
| Claude Code | https://docs.anthropic.com/en/docs/claude-code | JSON |
| Codex CLI | https://developers.openai.com/codex | TOML |
| Gemini CLI | https://github.com/google-gemini/gemini-cli/tree/main/docs | JSON |
| Cursor | https://docs.cursor.com | JSON |
| GitHub Copilot | https://docs.github.com/copilot | JSON |
| VS Code (Copilot) | https://code.visualstudio.com/docs/copilot | JSON |
| Windsurf | https://docs.windsurf.com | JSON |
| Roo Code | https://docs.roocode.com | JSON |
| Cline | https://docs.cline.bot | JSON |
| Kilo Code | https://kilocode.ai/docs | JSON |
| OpenCode | https://opencode.ai/docs | JSON |

---

## Concept Reference by Tool

### MCPs (Model Context Protocol)

All 10 tools support MCP servers. This is the most universal concept.

| Tool | Documentation | Config File(s) | Last Verified |
|------|--------------|-----------------|---------------|
| Claude Code | [MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) | `~/.claude.json`, `.mcp.json` | 2026-04-01 |
| Codex CLI | [MCP](https://developers.openai.com/codex/mcp) | `~/.codex/config.toml`, `.codex/config.toml` | 2026-04-01 |
| Gemini CLI | [MCP](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) | `~/.gemini/settings.json`, `.gemini/settings.json` | 2026-04-01 |
| Cursor | [MCP](https://docs.cursor.com/context/model-context-protocol) | `~/.cursor/mcp.json`, `.cursor/mcp.json` | 2026-04-01 |
| GitHub Copilot | [MCP](https://docs.github.com/copilot/customizing-copilot/using-model-context-protocol/extending-copilot-chat-with-mcp) | `~/.vscode/mcp.json`, `.vscode/mcp.json` | 2026-04-01 |
| Windsurf | [MCP](https://docs.windsurf.com/windsurf/cascade/mcp) | `~/.codeium/windsurf/mcp_config.json` | 2026-04-01 |
| Roo Code | [MCP overview](https://docs.roocode.com/features/mcp/overview), [Using MCP](https://docs.roocode.com/features/mcp/using-mcp-in-roo) | `~/.roo/mcp.json`, `.roo/mcp.json` | 2026-04-01 |
| Cline | [MCP overview](https://docs.cline.bot/mcp/mcp-overview), [Setup](https://docs.cline.bot/mcp/configuring-mcp-servers) | `~/.cline/mcp.json`, `.cline/mcp.json` | 2026-04-01 |
| Kilo Code | [MCP](https://kilocode.ai/docs/features/mcp/what-is-mcp), [Transports](https://kilocode.ai/docs/features/mcp/server-transports) | `~/.kilocode/mcp.json`, `.kilocode/mcp.json` | 2026-04-01 |
| OpenCode | [MCP](https://opencode.ai/docs/mcp-servers/) | `~/.config/opencode/opencode.json`, `opencode.json` | 2026-04-01 |

### Skills

Reusable prompt-based capabilities (SKILL.md files).

| Tool | Documentation | Location | Last Verified |
|------|--------------|----------|---------------|
| Claude Code | [Slash Commands / Skills](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | `~/.claude/skills/`, `.claude/skills/` | 2026-04-01 |
| Codex CLI | [AGENTS.md](https://developers.openai.com/codex/guides/agents-md) | `~/.agents/skills/`, `.agents/skills/` | 2026-04-01 |
| Gemini CLI | [Skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/tutorials/skills-getting-started.md) | `~/.gemini/skills/`, `.gemini/skills/` | 2026-04-01 |

### Agents / Sub-agents

Custom agentic workflows with isolated context.

| Tool | Documentation | Location | Last Verified |
|------|--------------|----------|---------------|
| Claude Code | [Sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) | `~/.claude/agents/`, `.claude/agents/` | 2026-04-01 |
| Gemini CLI | [Extensions (agents)](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/index.md) | `~/.gemini/agents/`, `.gemini/agents/` | 2026-04-01 |

### Hooks

Event-triggered automation (pre/post tool use, etc.).

| Tool | Documentation | Config | Last Verified |
|------|--------------|--------|---------------|
| Claude Code | [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) | `~/.claude/settings.json` | 2026-04-01 |
| Gemini CLI | [Hooks](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/index.md), [Reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md) | `~/.gemini/settings.json` (experimental) | 2026-04-01 |

### Prompts / Rules / Instructions

System-level instructions and project context files.

| Tool | Documentation | Files | Last Verified |
|------|--------------|-------|---------------|
| Claude Code | [Memory / CLAUDE.md](https://docs.anthropic.com/en/docs/claude-code/memory) | `CLAUDE.md`, `~/.claude/rules/` | 2026-04-01 |
| Codex CLI | [AGENTS.md](https://developers.openai.com/codex/guides/agents-md) | `AGENTS.md`, `~/.codex/rules/` | 2026-04-01 |
| Gemini CLI | [GEMINI.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md) | `GEMINI.md`, `~/.gemini/rules/` | 2026-04-01 |
| Cursor | [Rules](https://docs.cursor.com/context/rules) | `.cursor/rules/`, `.cursorrules` | 2026-04-01 |
| GitHub Copilot | [Custom Instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions) | `.github/copilot-instructions.md`, `.instructions.md` | 2026-04-01 |
| Windsurf | [Rules & Memories](https://docs.windsurf.com/windsurf/cascade/memories) | `.windsurf/rules/` | 2026-04-01 |
| Roo Code | [Custom Instructions](https://docs.roocode.com/features/custom-instructions) | `~/.roo/rules/`, `.roo/rules/` | 2026-04-01 |
| Cline | [Rules](https://docs.cline.bot/customization/cline-rules) | `.clinerules/` | 2026-04-01 |
| Kilo Code | [Custom Instructions](https://kilocode.ai/docs/advanced-usage/custom-instructions) | `~/.kilocode/rules/` | 2026-04-01 |
| OpenCode | [Rules](https://opencode.ai/docs/rules/) | `AGENTS.md`, config `instructions` array | 2026-04-01 |

### Plugins / Extensions

Bundled packages combining multiple capabilities.

| Tool | Documentation | Location | Last Verified |
|------|--------------|----------|---------------|
| Claude Code | [Overview (plugins)](https://docs.anthropic.com/en/docs/claude-code/overview) | `~/.claude/plugins/` | 2026-04-01 |
| Gemini CLI | [Extensions](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/index.md) | `gemini-extensions.json` | 2026-04-01 |

### Commands (Claude-only legacy)

| Tool | Documentation | Location | Last Verified |
|------|--------------|----------|---------------|
| Claude Code | [Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | `~/.claude/commands/` | 2026-04-01 |

---

## Configuration References

Full config file reference docs (useful when adding new fields to parsers).

| Tool | Reference | Last Verified |
|------|-----------|---------------|
| Codex CLI | [Config Reference](https://developers.openai.com/codex/config-reference) | 2026-04-01 |
| Gemini CLI | [Configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md) | 2026-04-01 |
| VS Code Copilot | [Customization Overview](https://code.visualstudio.com/docs/copilot/customization/overview) | 2026-04-01 |

---

## MCP Protocol Specification

The Model Context Protocol itself (transport layer, capability negotiation, tool schemas):

- **Spec**: https://modelcontextprotocol.io/specification
- **SDKs**: https://modelcontextprotocol.io/sdks

---

## Maintenance

When updating this file:
- Verify each URL resolves and points to the correct content
- Update the `Last Verified` date for rows you've checked
- Update `Last full review` date at the top when doing a complete pass
- Add new tools/concepts as the app's scope expands
