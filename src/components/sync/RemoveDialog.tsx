import { useCallback, useMemo, useState } from "react";
import { X, Loader2, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SourceTool, RemoveResult, AgentWriteResult } from "@/types";
import { Button } from "@/components/ui/button";
import { DialogOverlay } from "@/components/ui/dialog-overlay";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type RemoveItemType = "mcp" | "skill" | "agent";

interface ToolRemoveInfo {
  tool: SourceTool;
  /** Human-readable description of what will be deleted for this tool */
  detail: string;
}

interface RemoveDialogProps {
  type: RemoveItemType;
  name: string;
  /** Tools that have this item (what's available to remove from) */
  tools: ToolRemoveInfo[];
  /** Additional detail shown when all tools are selected (e.g., canonical path removal) */
  allSelectedDetail?: string;
  /** Called with selected tools to perform the removal */
  onRemove: (targetTools: SourceTool[]) => Promise<RemoveResult | AgentWriteResult>;
  onClose: () => void;
  /** Query key to invalidate on success */
  queryKey: string;
}

function normalizePath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, "~");
}

const TYPE_LABELS: Record<RemoveItemType, string> = {
  mcp: "MCP",
  skill: "Skill",
  agent: "Agent",
};

export function RemoveDialog({
  type,
  name,
  tools,
  allSelectedDetail,
  onRemove,
  onClose,
  queryKey,
}: RemoveDialogProps) {
  const queryClient = useQueryClient();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const isSingleTool = tools.length === 1;
  const [selectedTools, setSelectedTools] = useState<SourceTool[]>(
    isSingleTool ? [tools[0].tool] : []
  );

  const allSelected = selectedTools.length === tools.length;

  const toggleTool = (tool: SourceTool) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTools([]);
    } else {
      setSelectedTools(tools.map((t) => t.tool));
    }
  };

  const removeMutation = useMutation({
    mutationFn: () => onRemove(selectedTools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const result = removeMutation.data;
  const removedFiles = result
    ? "removedFiles" in result
      ? result.removedFiles
      : result.modifiedFiles
    : [];
  const errors = result?.errors ?? [];

  // Build confirmation text based on selected tools
  const confirmDetails = useMemo(() => {
    const details = tools
      .filter((t) => selectedTools.includes(t.tool))
      .map((t) => t.detail);
    if (allSelected && allSelectedDetail) {
      details.push(allSelectedDetail);
    }
    return details;
  }, [tools, selectedTools, allSelected, allSelectedDetail]);

  // Success state
  if (removeMutation.isSuccess && result) {
    return (
      <DialogOverlay onClose={onClose}>
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">
                {TYPE_LABELS[type]} Removed
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {removedFiles.length} path
                {removedFiles.length !== 1 ? "s" : ""} removed
              </p>
            </div>

            {removedFiles.length > 0 && (
              <div className="mx-auto max-w-sm space-y-1">
                {removedFiles.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-2 rounded-md bg-red-500/5 px-3 py-1.5 text-left text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span
                      className="min-w-0 truncate font-mono"
                      title={normalizePath(file)}
                    >
                      {normalizePath(file)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {errors.length > 0 && (
              <div className="mx-auto max-w-sm space-y-1">
                <p className="text-xs font-medium text-red-600">
                  Some tools failed:
                </p>
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </DialogOverlay>
    );
  }

  // Single tool — simpler confirmation
  if (isSingleTool) {
    return (
      <DialogOverlay onClose={onClose}>
        <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <h2 className="text-lg font-semibold">Remove {TYPE_LABELS[type]}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            {removeMutation.isError && (
              <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                {removeMutation.error instanceof Error
                  ? removeMutation.error.message
                  : String(removeMutation.error)}
              </div>
            )}

            <p className="text-sm">
              Remove <span className="font-semibold">{name}</span> from{" "}
              <span className="inline-flex items-center gap-1 font-medium">
                <ToolLogo tool={tools[0].tool} size={12} />
                {TOOL_CONFIG[tools[0].tool]?.label ?? tools[0].tool}
              </span>
              ?
            </p>

            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
              <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  {confirmDetails.map((detail, i) => (
                    <p key={i}>{detail}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </div>
        </div>
      </DialogOverlay>
    );
  }

  // Multi-tool — tool selection + confirmation
  return (
    <DialogOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            <h2 className="text-lg font-semibold">Remove {TYPE_LABELS[type]}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {removeMutation.isError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {removeMutation.error instanceof Error
                ? removeMutation.error.message
                : String(removeMutation.error)}
            </div>
          )}

          <p className="text-sm">
            Remove <span className="font-semibold">{name}</span> from:
          </p>

          {/* Select all */}
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/30">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-red-500"
            />
            <span className="text-sm font-medium">Select all tools</span>
          </label>

          {/* Tool checkboxes */}
          <div className="space-y-1">
            {tools.map((t) => (
              <label
                key={t.tool}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  checked={selectedTools.includes(t.tool)}
                  onChange={() => toggleTool(t.tool)}
                  className="accent-red-500"
                />
                <ToolLogo tool={t.tool} size={14} />
                <span className="text-sm">
                  {TOOL_CONFIG[t.tool]?.label ?? t.tool}
                </span>
              </label>
            ))}
          </div>

          {/* Confirmation details */}
          {selectedTools.length > 0 && (
            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
              <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-0.5">
                  {confirmDetails.map((detail, i) => (
                    <p key={i}>{detail}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => removeMutation.mutate()}
            disabled={selectedTools.length === 0 || removeMutation.isPending}
          >
            {removeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Remove from {selectedTools.length} Tool
            {selectedTools.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </DialogOverlay>
  );
}
