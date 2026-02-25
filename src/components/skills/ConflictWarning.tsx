import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { SkillConflict } from "@/types";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";

interface ConflictWarningProps {
  conflicts: SkillConflict[];
}

export function ConflictWarning({ conflicts }: ConflictWarningProps) {
  const [activeConflict, setActiveConflict] = useState<SkillConflict | null>(
    null
  );

  if (conflicts.length === 0) return null;

  return (
    <>
      <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">
            {conflicts.length} skill conflict{conflicts.length !== 1 ? "s" : ""}{" "}
            detected
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The following skills have the same name but different content across
          tools:
        </p>
        <ul className="mt-2 space-y-2">
          {conflicts.map((conflict) => (
            <li key={conflict.name} className="text-sm">
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {conflict.name}
                </code>
                <span className="text-muted-foreground">in</span>
                <div className="flex gap-1">
                  {conflict.tools.map((tool) => (
                    <ToolBadge key={tool} tool={tool} />
                  ))}
                </div>
                <button
                  onClick={() => setActiveConflict(conflict)}
                  className="ml-auto rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-700 transition-colors hover:bg-yellow-500/20"
                >
                  Review
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {activeConflict && (
        <ConflictResolutionDialog
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
        />
      )}
    </>
  );
}
