import { FileText, ChevronRight, Crosshair } from "lucide-react";
import type { PromptFile } from "@/types";
import { cn } from "@/lib/utils";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { toolAccentColor } from "@/config/tools";

interface RuleCardProps {
  rule: PromptFile;
  onClick: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatScopedPaths(paths: string[]): string {
  if (paths.length === 1) return paths[0];
  return `${paths[0]} +${paths.length - 1} more`;
}

export function RuleCard({ rule, onClick }: RuleCardProps) {
  const accentHex = toolAccentColor(rule.sourceTool);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card",
        !rule.exists && "opacity-40"
      )}
    >
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accentHex }} aria-hidden="true" />
      <button
        onClick={onClick}
        disabled={!rule.exists}
        className={cn(
          "flex w-full items-center gap-3 p-5 pl-[23px] text-left transition-colors hover:bg-muted/30",
          !rule.exists && "cursor-default hover:bg-transparent"
        )}
      >
        {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{rule.name}</h3>
          <ToolBadge tool={rule.sourceTool} />
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {rule.scope}
          </span>
          {rule.isScoped && (
            <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
              <Crosshair className="h-2.5 w-2.5" />
              scoped
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {rule.exists
            ? rule.isScoped && rule.scopedPaths?.length
              ? formatScopedPaths(rule.scopedPaths)
              : formatSize(rule.size)
            : "Not found"}
        </p>
      </div>

      {/* Arrow */}
      {rule.exists && (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </button>
    </div>
  );
}
