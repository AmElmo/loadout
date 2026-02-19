import { useState } from "react";
import { Sparkles, EyeOff, ChevronRight, Share2 } from "lucide-react";
import type { SkillItem } from "@/types";
import { cn } from "@/lib/utils";
import { installSkillToTools } from "@/lib/api/sync";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { SyncDialog } from "@/components/sync";
import { MaturityBadge } from "./MaturityBadge";
import { ALL_TOOLS } from "@/config/tools";

interface SkillCardProps {
  skill: SkillItem;
  onClick: () => void;
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const [showSync, setShowSync] = useState(false);

  const missingTools = ALL_TOOLS.filter((t) => t !== skill.sourceTool);
  const hasMissingTools = missingTools.length > 0;

  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50",
          skill.isShadowed && "opacity-60"
        )}
      >
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{skill.name}</h3>
            <ToolBadge tool={skill.sourceTool} />
            <MaturityBadge maturity={skill.maturity} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {skill.scope}
            </span>
            {skill.isShadowed && (
              <span
                className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                title={`Shadowed by: ${skill.shadowedBy}`}
              >
                <EyeOff className="h-3 w-3" />
                Shadowed
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {skill.description}
          </p>
        </div>

        {/* Sync button */}
        {hasMissingTools && (
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
          name={skill.name}
          existingTools={[skill.sourceTool]}
          onSync={(targetTools) =>
            installSkillToTools({
              name: skill.name,
              content: skill.content,
              targetTools,
            })
          }
          onClose={() => setShowSync(false)}
          queryKey="skills"
        />
      )}
    </>
  );
}
