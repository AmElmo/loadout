import { useMemo, useState } from "react";
import { X, Loader2, Share2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SourceTool } from "@/types";
import { Button } from "@/components/ui/button";
import { ToolSelector } from "./ToolSelector";
import { SuccessConfirmation } from "./SuccessConfirmation";

interface SyncDialogProps {
  type: "mcp" | "skill";
  name: string;
  /** Tools that already have this item */
  existingTools: SourceTool[];
  /** Restrict sync targets for compatibility (defaults to all tools) */
  availableTools?: SourceTool[];
  /** Called with selected target tools to perform the sync */
  onSync: (targetTools: SourceTool[]) => Promise<{
    success: boolean;
    modifiedFiles: string[];
    errors: string[];
  }>;
  onClose: () => void;
  /** Query key to invalidate on success */
  queryKey: string;
}

const ALL_TOOLS: SourceTool[] = ["claude", "codex", "gemini"];

export function SyncDialog({
  type,
  name,
  existingTools,
  availableTools,
  onSync,
  onClose,
  queryKey,
}: SyncDialogProps) {
  const queryClient = useQueryClient();
  const allowedTools = useMemo(
    () => availableTools ?? ALL_TOOLS,
    [availableTools]
  );
  const disabledTools = ALL_TOOLS.filter((t) => !allowedTools.includes(t));
  const missingTools = allowedTools.filter((t) => !existingTools.includes(t));
  const [targetTools, setTargetTools] = useState<SourceTool[]>(missingTools);
  const effectiveTargetTools = targetTools.filter((tool) =>
    allowedTools.includes(tool)
  );

  const syncMutation = useMutation({
    mutationFn: () => onSync(effectiveTargetTools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  if (syncMutation.isSuccess && syncMutation.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <SuccessConfirmation
            result={syncMutation.data}
            type={type}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <h2 className="text-lg font-semibold">
              Sync {type === "mcp" ? "MCP" : "Skill"} to Other Tools
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          {syncMutation.isError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {syncMutation.error instanceof Error
                ? syncMutation.error.message
                : String(syncMutation.error)}
            </div>
          )}

          <p className="text-sm">
            Sync <span className="font-semibold">{name}</span> to other tools:
          </p>

          <ToolSelector
            selectedTools={effectiveTargetTools}
            onToolsChange={setTargetTools}
            type={type}
            existingTools={existingTools}
            disabledTools={disabledTools}
            disabledReason={
              type === "mcp"
                ? "stdio only"
                : undefined
            }
          />

          {missingTools.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This {type === "mcp" ? "MCP" : "skill"} is already configured in
              all tools.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={
              effectiveTargetTools.length === 0 ||
              syncMutation.isPending ||
              missingTools.length === 0
            }
          >
            {syncMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sync to {effectiveTargetTools.length} Tool
            {effectiveTargetTools.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
