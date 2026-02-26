import { AlertTriangle } from "lucide-react";
import type { AgentConflict, AgentSourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";

interface AgentConflictWarningProps {
  conflicts: AgentConflict[];
}

export function AgentConflictWarning({ conflicts }: AgentConflictWarningProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
      <div className="flex items-center gap-2 text-yellow-600">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="font-medium">
          {conflicts.length} subagent conflict{conflicts.length !== 1 ? "s" : ""}{" "}
          detected
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The following subagents have the same name but different content across
        tools:
      </p>
      <ul className="mt-2 space-y-2">
        {conflicts.map((conflict) => (
          <li key={conflict.name} className="text-sm">
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {conflict.name}
              </code>
              <span className="text-muted-foreground">in</span>
              <div className="flex gap-1">
                {conflict.tools.map((tool: AgentSourceTool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    <ToolLogo tool={tool} size={10} />
                    {TOOL_CONFIG[tool]?.label ?? tool}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
