import { useState, useCallback, useMemo } from "react";
import { X, Loader2, Check, GitCompareArrows, Clock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { structuredPatch } from "diff";
import type { SkillConflict, SkillVersion } from "@/types";
import { getSkillConflictDetails, resolveSkillConflict } from "@/lib/api/skills";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { Button } from "@/components/ui/button";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/utils";

interface ConflictResolutionDialogProps {
  conflict: SkillConflict;
  onClose: () => void;
}

export function ConflictResolutionDialog({
  conflict,
  onClose,
}: ConflictResolutionDialogProps) {
  const queryClient = useQueryClient();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const {
    data: versions,
    isPending: isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["skill-conflict-details", conflict.name, conflict.conflictingPaths],
    queryFn: () =>
      getSkillConflictDetails(conflict.name, conflict.conflictingPaths),
  });

  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPath) throw new Error("No version selected");
      const targetPaths = conflict.conflictingPaths.filter(
        (p) => p !== selectedPath
      );
      return resolveSkillConflict(conflict.name, selectedPath, targetPaths);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const selectedVersion = versions?.find((v) => v.path === selectedPath);

  // Diff: compare the selected version against all others.
  // When nothing is selected yet, diff the first two versions as a default preview.
  const diffPair = useMemo<
    { left: SkillVersion; right: SkillVersion } | null
  >(() => {
    if (!versions || versions.length < 2) return null;
    if (!selectedVersion) {
      return { left: versions[0], right: versions[1] };
    }
    const other = versions.find((v) => v.path !== selectedPath);
    if (!other) return null;
    return { left: other, right: selectedVersion };
  }, [versions, selectedVersion, selectedPath]);

  if (resolveMutation.isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Conflict Resolved</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              All versions of <span className="font-mono">{conflict.name}</span>{" "}
              have been synced to the{" "}
              <ToolBadge tool={selectedVersion!.sourceTool} /> version.
            </p>
            <Button onClick={onClose} className="mt-4">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" />
            <h2 className="text-lg font-semibold">
              Resolve Conflict: <span className="font-mono">{conflict.name}</span>
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isLoading && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {loadError && (
            <div className="m-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {loadError instanceof Error
                ? loadError.message
                : String(loadError)}
            </div>
          )}

          {resolveMutation.isError && (
            <div className="mx-4 mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {resolveMutation.error instanceof Error
                ? resolveMutation.error.message
                : String(resolveMutation.error)}
            </div>
          )}

          {versions && versions.length >= 2 && (
            <>
              {/* Version selector */}
              <div className="border-b border-border px-4 py-3">
                <p className="mb-2 text-sm text-muted-foreground">
                  Choose which version to keep. The selected version will be
                  written to all other tool locations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {versions.map((version) => (
                    <button
                      key={version.path}
                      onClick={() => setSelectedPath(version.path)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        selectedPath === version.path
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <ToolBadge tool={version.sourceTool} />
                      {version.lastModified && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(version.lastModified)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diff view */}
              <div className="min-h-0 flex-1 overflow-auto">
                {diffPair ? (
                  <UnifiedDiff left={diffPair.left} right={diffPair.right} />
                ) : (
                  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                    Select a version to see the diff.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Dismiss
          </Button>
          <Button
            onClick={() => resolveMutation.mutate()}
            disabled={
              !selectedPath ||
              resolveMutation.isPending
            }
          >
            {resolveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {selectedPath ? "Apply Selected Version" : "Select a Version"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/** GitHub-style unified diff between two versions */
function UnifiedDiff({ left, right }: { left: SkillVersion; right: SkillVersion }) {
  const hunks = useMemo(() => {
    const patch = structuredPatch(
      left.sourceTool,
      right.sourceTool,
      left.content,
      right.content,
      undefined,
      undefined,
      { context: 3 }
    );
    return patch.hunks;
  }, [left, right]);

  if (hunks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No differences found between these versions.
      </div>
    );
  }

  return (
    <div className="font-mono text-xs">
      {/* Legend */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <ToolBadge tool={left.sourceTool} />
          <span className="text-red-600">(removed)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <ToolBadge tool={right.sourceTool} />
          <span className="text-green-600">(added)</span>
        </span>
      </div>

      {hunks.map((hunk, hunkIdx) => (
        <div key={hunkIdx}>
          {/* Hunk header */}
          <div className="bg-blue-500/5 px-4 py-1 text-blue-600">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines}{" "}
            @@
          </div>
          {/* Lines */}
          {hunk.lines.map((line, lineIdx) => {
            const type = line[0];
            const content = line.slice(1);
            return (
              <div
                key={lineIdx}
                className={cn(
                  "whitespace-pre-wrap break-all px-4 py-0.5",
                  type === "-" && "bg-red-500/10 text-red-700 dark:text-red-400",
                  type === "+" && "bg-green-500/10 text-green-700 dark:text-green-400",
                  type === " " && "text-foreground"
                )}
              >
                <span className="mr-3 inline-block w-4 select-none text-muted-foreground">
                  {type}
                </span>
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
