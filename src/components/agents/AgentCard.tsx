import { useState } from "react";
import { EyeOff, ChevronRight, Share2 } from "lucide-react";
import type { GroupedAgent, AgentSourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { MaturityBadge } from "@/components/skills/MaturityBadge";
import { ItemIcon } from "@/components/ItemIcon";
import { AgentSyncDialog } from "./AgentSyncDialog";

const AGENT_TOOLS: AgentSourceTool[] = ["claude", "gemini"];

interface AgentCardProps {
  group: GroupedAgent;
  onClick: () => void;
}

export function AgentCard({ group, onClick }: AgentCardProps) {
  const [showSync, setShowSync] = useState(false);

  const missingTools = AGENT_TOOLS.filter(
    (t) => !group.installedTools.includes(t)
  );
  const hasMissingTools = missingTools.length > 0;
  const canQuickSyncFromCard = hasMissingTools && !group.hasContentDrift;

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50",
          group.primary.isShadowed && "opacity-60"
        )}
      >
        {/* Icon */}
        <ItemIcon name={group.name} description={group.description} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{group.name}</h3>
            <div className="flex gap-0.5">
              {group.installedTools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                  title={TOOL_CONFIG[tool]?.label ?? tool}
                >
                  <ToolLogo tool={tool} size={10} />
                  {TOOL_CONFIG[tool]?.label ?? tool}
                </span>
              ))}
            </div>
            <MaturityBadge maturity={group.maturity} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {group.scope}
            </span>
            {group.model && (
              <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                {group.model}
              </span>
            )}
            {group.primary.isShadowed && (
              <span
                className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                title={`Shadowed by: ${group.primary.shadowedBy}`}
              >
                <EyeOff className="h-3 w-3" />
                Shadowed
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {group.description}
          </p>
          {group.tools && (
            <div className="mt-1 flex flex-wrap gap-1">
              {group.tools.split(",").map((tool) => (
                <span
                  key={tool.trim()}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                >
                  {tool.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sync button */}
        {canQuickSyncFromCard && (
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowSync(true);
            }}
            title="Sync this agent to other tools"
          >
            <div className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {showSync && (
        <AgentSyncDialog
          group={group}
          onClose={() => setShowSync(false)}
        />
      )}
    </>
  );
}
