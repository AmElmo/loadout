import { AlertTriangle } from "lucide-react";
import type { SourceTool } from "@/types";
import { cn } from "@/lib/utils";

interface ToolSelectorProps {
  selectedTools: SourceTool[];
  onToolsChange: (tools: SourceTool[]) => void;
  type?: "mcp" | "skill";
}

const tools: { id: SourceTool; label: string; color: string }[] = [
  {
    id: "claude",
    label: "Claude Code",
    color: "accent-orange-500",
  },
  {
    id: "codex",
    label: "Codex CLI",
    color: "accent-green-500",
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    color: "accent-blue-500",
  },
];

export function ToolSelector({
  selectedTools,
  onToolsChange,
  type = "mcp",
}: ToolSelectorProps) {
  const toggle = (tool: SourceTool) => {
    if (selectedTools.includes(tool)) {
      onToolsChange(selectedTools.filter((t) => t !== tool));
    } else {
      onToolsChange([...selectedTools, tool]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Target Tools</label>
      <div className="flex flex-wrap gap-3">
        {tools.map(({ id, label, color }) => (
          <label
            key={id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              selectedTools.includes(id)
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={selectedTools.includes(id)}
              onChange={() => toggle(id)}
              className={cn("h-4 w-4 rounded", color)}
            />
            {label}
          </label>
        ))}
      </div>
      {type === "skill" && selectedTools.includes("gemini") && (
        <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Skills are experimental in Gemini CLI (requires{" "}
          <code className="rounded bg-yellow-500/20 px-1">
            experiments.agentSkills: true
          </code>
          )
        </div>
      )}
    </div>
  );
}
