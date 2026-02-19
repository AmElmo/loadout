import { AlertTriangle, Check } from "lucide-react";
import type { SourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";
import { ALL_TOOLS, TOOL_CONFIG } from "@/config/tools";

interface ToolSelectorProps {
  selectedTools: SourceTool[];
  onToolsChange: (tools: SourceTool[]) => void;
  type?: "mcp" | "skill";
  existingTools?: SourceTool[];
  disabledTools?: SourceTool[];
  disabledReason?: string;
}

const tools = ALL_TOOLS.map((id) => ({
  id,
  label: TOOL_CONFIG[id].label,
  color: `accent-${TOOL_CONFIG[id].color}-500`,
}));

export function ToolSelector({
  selectedTools,
  onToolsChange,
  type = "mcp",
  existingTools = [],
  disabledTools = [],
  disabledReason,
}: ToolSelectorProps) {
  const toggle = (tool: SourceTool) => {
    if (disabledTools.includes(tool)) {
      return;
    }

    if (selectedTools.includes(tool)) {
      onToolsChange(selectedTools.filter((t) => t !== tool));
    } else {
      onToolsChange([...selectedTools, tool]);
    }
  };

  const installedTools = tools.filter(({ id }) => existingTools.includes(id));
  const targetTools = tools.filter(
    ({ id }) => !existingTools.includes(id)
  );

  return (
    <div className="space-y-4">
      {/* Already installed section */}
      {installedTools.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Already installed in
          </label>
          <div className="flex flex-wrap gap-3">
            {installedTools.map(({ id, label }) => (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-green-500" />
                <ToolLogo tool={id} size={14} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync targets section */}
      {targetTools.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Sync to</label>
          <div className="flex flex-wrap gap-3">
            {targetTools.map(({ id, label, color }) => {
              const isDisabled = disabledTools.includes(id);
              return (
                <label
                  key={id}
                  title={isDisabled ? disabledReason : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer",
                    selectedTools.includes(id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(id)}
                    onChange={() => toggle(id)}
                    disabled={isDisabled}
                    className={cn("h-4 w-4 rounded", color)}
                  />
                  <ToolLogo tool={id} size={14} />
                  {label}
                  {isDisabled && disabledReason && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({disabledReason})
                    </span>
                  )}
                </label>
              );
            })}
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
      )}
    </div>
  );
}
