import type { SourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";

const tools: {
  id: SourceTool;
  format: string;
  mcpConfig: string;
  skillsDir: string;
  rulesFile: string;
}[] = [
  {
    id: "claude",
    format: "JSON",
    mcpConfig: "~/.claude.json",
    skillsDir: "~/.claude/skills/",
    rulesFile: "CLAUDE.md",
  },
  {
    id: "codex",
    format: "TOML",
    mcpConfig: "~/.codex/config.toml",
    skillsDir: "~/.agents/skills/",
    rulesFile: "AGENTS.md",
  },
  {
    id: "gemini",
    format: "JSON",
    mcpConfig: "~/.gemini/settings.json",
    skillsDir: "~/.gemini/skills/",
    rulesFile: "GEMINI.md",
  },
  {
    id: "cursor",
    format: "JSON",
    mcpConfig: "~/.cursor/mcp.json",
    skillsDir: "~/.cursor/skills/",
    rulesFile: ".cursor/rules/*.mdc",
  },
  {
    id: "copilot",
    format: "JSON",
    mcpConfig: "~/.vscode/mcp.json",
    skillsDir: "~/.copilot/skills/",
    rulesFile: "copilot-instructions.md",
  },
  {
    id: "windsurf",
    format: "JSON",
    mcpConfig: "~/.codeium/windsurf/mcp_config.json",
    skillsDir: "~/.codeium/windsurf/skills/",
    rulesFile: ".windsurf/rules/*.md",
  },
  {
    id: "roo",
    format: "JSON",
    mcpConfig: "~/.roo/mcp.json",
    skillsDir: "~/.roo/skills/",
    rulesFile: ".roo/rules/*.md",
  },
  {
    id: "cline",
    format: "JSON",
    mcpConfig: "~/.cline/mcp.json",
    skillsDir: "~/.cline/skills/",
    rulesFile: ".clinerules",
  },
  {
    id: "kilo",
    format: "JSON",
    mcpConfig: "~/.kilocode/mcp.json",
    skillsDir: "~/.kilocode/skills/",
    rulesFile: ".kilocode/rules/*.md",
  },
  {
    id: "opencode",
    format: "JSON",
    mcpConfig: "~/.config/opencode/opencode.json",
    skillsDir: "~/.config/opencode/skills/",
    rulesFile: "AGENT.md",
  },
];

export function EcosystemTable() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-1 font-semibold">The Ecosystem</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Loadout supports 10 AI coding tools. They share the same concepts but
        store configuration in different files and formats.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Tool</th>
              <th className="pb-2 pr-4 font-medium">Format</th>
              <th className="pb-2 pr-4 font-medium">MCP Config</th>
              <th className="pb-2 pr-4 font-medium">Skills</th>
              <th className="pb-2 font-medium">Rules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tools.map((tool) => {
              const config = TOOL_CONFIG[tool.id];
              return (
              <tr key={tool.id}>
                <td className={`py-2.5 pr-4 font-medium ${config.textClass}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <ToolLogo tool={tool.id} size={13} />
                    {config.label}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {tool.format}
                </td>
                <td className="py-2.5 pr-4 font-mono text-muted-foreground">
                  {tool.mcpConfig}
                </td>
                <td className="py-2.5 pr-4 font-mono text-muted-foreground">
                  {tool.skillsDir}
                </td>
                <td className="py-2.5 font-mono text-muted-foreground">
                  {tool.rulesFile}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground/70">
        Project-level configs (like <span className="font-mono">.mcp.json</span>{" "}
        for MCPs) live in the workspace root and apply only to that project.
      </p>
    </div>
  );
}
