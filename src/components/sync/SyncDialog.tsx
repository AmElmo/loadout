import { useCallback, useMemo, useState } from "react";
import { X, Loader2, Share2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExistingToolInfo, InstallMethod, SourceTool, WriteResult } from "@/types";
import { Button } from "@/components/ui/button";
import { DialogOverlay } from "@/components/ui/dialog-overlay";
import { ToolSelector } from "./ToolSelector";
import { SuccessConfirmation } from "./SuccessConfirmation";
import { InstallMethodSelector } from "./InstallMethodSelector";
import { detectInstalledTools } from "@/lib/api/detection";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useSubmitShortcut } from "@/hooks/useSubmitShortcut";

interface SyncDialogProps {
  type: "mcp" | "skill";
  name: string;
  /** Tools that already have this item */
  existingTools: SourceTool[];
  /** Called with selected target tools and method to perform the sync */
  onSync: (
    targetTools: SourceTool[],
    method?: InstallMethod
  ) => Promise<WriteResult>;
  onClose: () => void;
  /** Query key to invalidate on success */
  queryKey: string;
  /** Install methods for each existing tool (enables conversion UI) */
  existingToolMethods?: ExistingToolInfo[];
  /** Callback to convert copy-installed tools to links */
  onConvert?: (tools: SourceTool[]) => Promise<WriteResult>;
  /** Whether variants have content drift (shows warning in conversion banner) */
  hasContentDrift?: boolean;
}

export function SyncDialog({
  type,
  name,
  existingTools,
  onSync,
  onClose,
  queryKey,
  existingToolMethods,
  onConvert,
  hasContentDrift,
}: SyncDialogProps) {
  const queryClient = useQueryClient();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  // Only show tools that are actually installed on the user's machine
  const {
    data: detectionResult,
    error: detectionError,
    isPending: isDetectingTools,
  } = useQuery({
    queryKey: ["installed-tools"],
    queryFn: detectInstalledTools,
  });

  const installedToolIds = useMemo(
    () =>
      detectionResult
        ? (detectionResult.tools.map((t) => t.id) as SourceTool[])
        : [],
    [detectionResult]
  );
  const detectionErrorMessage = detectionError
    ? detectionError instanceof Error
      ? detectionError.message
      : String(detectionError)
    : null;

  // Default to nothing selected — the user picks where to sync
  const [targetTools, setTargetTools] = useState<SourceTool[]>([]);
  const [method, setMethod] = useState<InstallMethod>("link");
  const effectiveTargetTools = targetTools.filter(
    (tool) => installedToolIds.includes(tool) && !existingTools.includes(tool)
  );
  const allSynced =
    installedToolIds.length > 0 &&
    installedToolIds.every((t) => existingTools.includes(t));

  const syncMutation = useMutation({
    mutationFn: () =>
      onSync(effectiveTargetTools, type === "skill" ? method : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const copyTools = useMemo(
    () =>
      (existingToolMethods ?? [])
        .filter((t) => t.method === "copy")
        .map((t) => t.tool),
    [existingToolMethods]
  );

  const convertMutation = useMutation({
    mutationFn: () => onConvert!(copyTools),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const conversionState = useMemo(() => {
    if (!onConvert || !existingToolMethods) return undefined;
    const data = convertMutation.data;
    const isSuccess = convertMutation.isSuccess && !!data;
    const isPartial = isSuccess && (data.symlinkFailed || data.errors.length > 0);
    return {
      isPending: convertMutation.isPending,
      isSuccess: isSuccess && !isPartial,
      isPartial,
      canonicalPath: data?.canonicalPath ?? null,
      error: convertMutation.error,
      onConvert: () => convertMutation.mutate(),
    };
  }, [onConvert, existingToolMethods, convertMutation]);

  const canSync =
    !detectionErrorMessage &&
    effectiveTargetTools.length > 0 &&
    !syncMutation.isPending &&
    !syncMutation.isSuccess &&
    !allSynced;
  useSubmitShortcut(() => syncMutation.mutate(), canSync);

  if (syncMutation.isSuccess && syncMutation.data) {
    return (
      <DialogOverlay onClose={onClose}>
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <SuccessConfirmation
            result={syncMutation.data}
            type={type}
            onClose={onClose}
          />
        </div>
      </DialogOverlay>
    );
  }

  const title =
    type === "mcp"
      ? "Sync MCP to Other Tools"
      : "Add Skill to Other Tools";

  return (
    <DialogOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <h2 className="text-lg font-semibold">{title}</h2>
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
          {detectionErrorMessage && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              Could not detect installed tools. Sync is blocked until detection
              succeeds.
              <br />
              <span className="text-xs">{detectionErrorMessage}</span>
            </div>
          )}

          <p className="text-sm">
            Add <span className="font-semibold">{name}</span> to other tools:
          </p>

          {/* Install method selector for skills */}
          {type === "skill" && (
            <InstallMethodSelector method={method} onChange={setMethod} />
          )}

          {isDetectingTools && !detectionErrorMessage && (
            <p className="text-xs text-muted-foreground">
              Detecting installed tools...
            </p>
          )}
          <ToolSelector
            selectedTools={effectiveTargetTools}
            onToolsChange={setTargetTools}
            type={type}
            existingTools={existingTools}
            availableTools={installedToolIds}
            installMethod={type === "skill" ? method : undefined}
            existingToolMethods={existingToolMethods}
            conversionState={conversionState}
            hasContentDrift={hasContentDrift}
          />

          {allSynced && (
            <p className="text-sm text-muted-foreground">
              This {type === "mcp" ? "MCP" : "skill"} is already configured in
              all your installed tools.
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
              !!detectionErrorMessage ||
              effectiveTargetTools.length === 0 ||
              syncMutation.isPending ||
              allSynced
            }
          >
            {syncMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add to {effectiveTargetTools.length} Tool
            {effectiveTargetTools.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </DialogOverlay>
  );
}
