import { useState } from "react";
import { EyeOff, ChevronRight, Share2 } from "lucide-react";
import type { GroupedSkill } from "@/types";
import { cn } from "@/lib/utils";
import { installSkillToTools } from "@/lib/api/sync";
import { ToolBadges } from "@/components/mcps/ToolBadge";
import { SyncDialog } from "@/components/sync";
import { SkillIcon } from "./SkillIcon";
import { MaturityBadge } from "./MaturityBadge";
import { ALL_TOOLS, toolAccentColor } from "@/config/tools";

interface SkillCardProps {
  group: GroupedSkill;
  onClick: () => void;
}

export function SkillCard({ group, onClick }: SkillCardProps) {
  const [showSync, setShowSync] = useState(false);

  const missingTools = ALL_TOOLS.filter((t) => !group.installedTools.includes(t));
  const hasMissingTools = missingTools.length > 0;
  const hasCopyInstalls = group.variants.some((v) => !v.isSymlinked);
  const existingToolMethods = group.variants.map((v) => ({
    tool: v.sourceTool,
    method: v.isSymlinked ? "link" as const : "copy" as const,
  }));
  // When variants drift across tools, force users to choose a specific variant in the viewer.
  // Also show sync when there are copy installs that could be converted to links.
  const canQuickSyncFromCard =
    (hasMissingTools || hasCopyInstalls) && !group.hasContentDrift;

  const accentHex = group.installedTools[0] ? toolAccentColor(group.installedTools[0]) : "#3b82f6";

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-card",
          group.primary.isShadowed && "opacity-60"
        )}
      >
        <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accentHex }} aria-hidden="true" />
        <button
          onClick={onClick}
          className="flex w-full items-center gap-3 p-5 pl-[23px] text-left transition-colors hover:bg-muted/30"
        >
          {/* Icon */}
          <SkillIcon name={group.name} description={group.description} />

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
      </div>

      {showSync && (
        <SyncDialog
          type="skill"
          name={group.name}
          existingTools={group.installedTools}
          existingToolMethods={existingToolMethods}
          hasContentDrift={group.hasContentDrift}
          onSync={(targetTools, method) =>
            installSkillToTools({
              name: group.name,
              content: group.primary.content,
              targetTools,
              method: method ?? "link",
              files: [],
            })
          }
          onConvert={(tools) =>
            installSkillToTools({
              name: group.name,
              content: group.primary.content,
              targetTools: tools,
              method: "link",
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
