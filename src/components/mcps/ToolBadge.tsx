import type { SourceTool } from "@/types";
import { cn } from "@/lib/utils";

interface ToolBadgeProps {
  tool: SourceTool;
  className?: string;
}

const toolColors: Record<SourceTool, string> = {
  claude: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  codex: "bg-green-500/10 text-green-600 border-green-500/20",
  gemini: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const toolLabels: Record<SourceTool, string> = {
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
};

export function ToolBadge({ tool, className }: ToolBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        toolColors[tool],
        className
      )}
    >
      {toolLabels[tool]}
    </span>
  );
}

interface ToolBadgesProps {
  tools: SourceTool[];
  className?: string;
}

export function ToolBadges({ tools, className }: ToolBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tools.map((tool) => (
        <ToolBadge key={tool} tool={tool} />
      ))}
    </div>
  );
}
