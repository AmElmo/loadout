import type { SourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG, toolLabel } from "@/config/tools";

interface ToolBadgeProps {
  tool: SourceTool;
  className?: string;
}

export function ToolBadge({ tool, className }: ToolBadgeProps) {
  const config = TOOL_CONFIG[tool];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        config?.badgeClass ?? "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      <ToolLogo tool={tool} size={10} />
      {toolLabel(tool)}
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
