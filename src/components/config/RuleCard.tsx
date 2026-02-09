import { FileText, ChevronRight } from "lucide-react";
import type { PromptFile } from "@/types";
import { cn } from "@/lib/utils";
import { ToolBadge } from "@/components/mcps/ToolBadge";

interface RuleCardProps {
  rule: PromptFile;
  onClick: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function RuleCard({ rule, onClick }: RuleCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!rule.exists}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50",
        !rule.exists && "opacity-40 cursor-default hover:bg-card"
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
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {rule.exists ? formatSize(rule.size) : "Not found"}
        </p>
      </div>

      {/* Arrow */}
      {rule.exists && (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
