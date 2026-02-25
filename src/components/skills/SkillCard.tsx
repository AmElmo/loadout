import { useState } from "react";
import { EyeOff, ChevronRight, Share2 } from "lucide-react";
import type { GroupedSkill } from "@/types";
import { cn } from "@/lib/utils";
import { installSkillToTools } from "@/lib/api/sync";
import { ToolBadges } from "@/components/mcps/ToolBadge";
import { SyncDialog } from "@/components/sync";
import { SkillIcon } from "./SkillIcon";
import { MaturityBadge } from "./MaturityBadge";
import { ALL_TOOLS } from "@/config/tools";

interface SkillCardProps {
  group: GroupedSkill;
  onClick: () => void;
}

export function SkillCard({ group, onClick }: SkillCardProps) {
  const [showSync, setShowSync] = useState(false);

  const missingTools = ALL_TOOLS.filter((t) => !group.installedTools.includes(t));
  const hasMissingTools = missingTools.length > 0;
  // When variants drift across tools, force users to choose a specific variant in the viewer.
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
        <SkillIcon name={group.name} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{group.name}</h3>
            <ToolBadges tools={group.installedTools} />
            <MaturityBadge maturity={group.maturity} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {group.scope}
            </span>
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
        </div>

        {/* Sync button */}
        {canQuickSyncFromCard && (
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowSync(true);
            }}
            title="Copy this skill to other tools"
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
        <SyncDialog
          type="skill"
          name={group.name}
          existingTools={group.installedTools}
          onSync={(targetTools, method) =>
            installSkillToTools({
              name: group.name,
              content: group.primary.content,
              targetTools,
              method: method ?? "link",
              files: [],
            })
          }
          onClose={() => setShowSync(false)}
          queryKey="skills"
        />
      )}
    </>
  );
}
