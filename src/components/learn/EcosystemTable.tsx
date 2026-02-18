import type { SourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";

const tools: {
  id: SourceTool;
  name: string;
  color: string;
  format: string;
  mcpConfig: string;
  skillsDir: string;
  rulesFile: string;
}[] = [
  {
    id: "claude",
    name: "Claude Code",
    color: "text-orange-500",
    format: "JSON",
    mcpConfig: "~/.claude.json",
    skillsDir: "~/.claude/skills/",
    rulesFile: "CLAUDE.md",
  },
  {
    id: "codex",
    name: "Codex CLI",
    color: "text-green-500",
    format: "TOML",
    mcpConfig: "~/.codex/config.toml",
    skillsDir: "~/.codex/skills/",
    rulesFile: "AGENTS.md",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    color: "text-blue-500",
    format: "JSON",
    mcpConfig: "~/.gemini/settings.json",
    skillsDir: "~/.gemini/skills/",
    rulesFile: "GEMINI.md",
  },
];

export function EcosystemTable() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-1 font-semibold">The Ecosystem</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Three AI coding tools share the same concepts but store configuration in
        different files and formats.
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
            {tools.map((tool) => (
              <tr key={tool.name}>
                <td className={`py-2.5 pr-4 font-medium ${tool.color}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <ToolLogo tool={tool.id} size={13} />
                    {tool.name}
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
            ))}
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
