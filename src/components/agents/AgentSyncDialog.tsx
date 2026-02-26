import { useCallback, useState } from "react";
import { X, Loader2, Share2, AlertCircle, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GroupedAgent, AgentSourceTool, AgentWriteResult } from "@/types";
import { syncAgentToTools } from "@/lib/api/agents";
import { Button } from "@/components/ui/button";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";

const AGENT_TOOLS: AgentSourceTool[] = ["claude", "gemini"];

interface AgentSyncDialogProps {
  group: GroupedAgent;
  onClose: () => void;
}

export function AgentSyncDialog({ group, onClose }: AgentSyncDialogProps) {
  const queryClient = useQueryClient();
  const { current } = useWorkspaceStore();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const [targetTools, setTargetTools] = useState<AgentSourceTool[]>([]);

  const syncMutation = useMutation({
    mutationFn: () => {
      const filename = group.primary.path
        .split("/")
        .pop()
        ?.replace(/\.md$/, "") ?? group.name;
      return syncAgentToTools({
        filename,
        sourceTool: group.primary.sourceTool,
        sourcePath: group.primary.path,
        targetTools,
        scope: group.scope,
        workspacePath: current?.path,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  if (syncMutation.isSuccess) {
    const result = syncMutation.data as AgentWriteResult;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <div className="text-center">
            <div className={cn(
              "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
              result.success ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {result.success ? (
                <Share2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {result.success ? "Agent Synced" : "Sync Failed"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.success
                ? <>Successfully synced <span className="font-medium">{group.name}</span></>
                : <>Failed to sync <span className="font-medium">{group.name}</span> to some tools</>}
            </p>
            {result.modifiedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.modifiedFiles.map((f) => (
                  <p key={f} className="truncate font-mono text-xs text-muted-foreground">
                    {f}
                  </p>
                ))}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((e) => (
                  <p key={e} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <Button className="mt-4" onClick={onClose}>
              Done
            </Button>
          </div>
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
            <h2 className="text-lg font-semibold">Sync Agent to Other Tools</h2>
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
            Sync <span className="font-semibold">{group.name}</span> to other
            tools:
          </p>

          <div className="space-y-2">
            {AGENT_TOOLS.map((tool) => {
              const isExisting = group.installedTools.includes(tool);
              const isSelected = targetTools.includes(tool);
              return (
                <label
                  key={tool}
                  className={cn(
                    "flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors",
                    isExisting
                      ? "cursor-not-allowed opacity-50"
                      : isSelected
                        ? "border-primary bg-primary/5"
                        : "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isExisting}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetTools([...targetTools, tool]);
                      } else {
                        setTargetTools(targetTools.filter((t) => t !== tool));
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <ToolLogo tool={tool} size={14} />
                  <span className="flex-1 text-sm font-medium">
                    {TOOL_CONFIG[tool]?.label ?? tool}
                  </span>
                  {isExisting && (
                    <span className="text-xs text-muted-foreground">
                      Already configured
                    </span>
                  )}
                </label>
              );
            })}

            {/* Codex — always disabled */}
            <div
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 opacity-50"
              title="Codex CLI does not support agents"
            >
              <input
                type="checkbox"
                disabled
                className="h-4 w-4 rounded border-border"
              />
              <ToolLogo tool="codex" size={14} />
              <span className="flex-1 text-sm font-medium">
                {TOOL_CONFIG.codex?.label ?? "Codex"}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Not Supported
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={targetTools.length === 0 || syncMutation.isPending}
          >
            {syncMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sync to {targetTools.length} Tool
            {targetTools.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
