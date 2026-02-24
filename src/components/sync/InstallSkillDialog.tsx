import { useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InstallMethod, InstallSkillRequest, SourceTool } from "@/types";
import { installSkillToTools } from "@/lib/api/sync";
import { detectInstalledTools } from "@/lib/api/detection";
import { Button } from "@/components/ui/button";
import { ToolSelector } from "./ToolSelector";
import { SuccessConfirmation } from "./SuccessConfirmation";
import { InstallMethodSelector } from "./InstallMethodSelector";

interface InstallSkillDialogProps {
  onClose: () => void;
}

export function InstallSkillDialog({ onClose }: InstallSkillDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetTools, setTargetTools] = useState<SourceTool[]>([]);
  const [method, setMethod] = useState<InstallMethod>("link");

  // Detect installed tools — only show these in the selector
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
  const effectiveTargetTools = targetTools.filter((tool) =>
    installedToolIds.includes(tool)
  );

  const buildContent = (): string => {
    const lines = [];
    lines.push("---");
    lines.push(`name: ${name.trim()}`);
    if (description.trim()) {
      lines.push(`description: ${description.trim()}`);
    }
    lines.push("---");
    lines.push("");
    lines.push(instructions);
    return lines.join("\n");
  };

  const buildRequest = (): InstallSkillRequest => ({
    name: name.trim(),
    content: buildContent(),
    targetTools: effectiveTargetTools,
    method,
    files: [],
  });

  const writeMutation = useMutation({
    mutationFn: installSkillToTools,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const handleSubmit = () => {
    if (detectionErrorMessage) return;
    writeMutation.mutate(buildRequest());
  };

  const isValid =
    !detectionErrorMessage &&
    name.trim() &&
    instructions.trim() &&
    effectiveTargetTools.length > 0;

  // Show success state
  if (writeMutation.isSuccess && writeMutation.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <SuccessConfirmation
            result={writeMutation.data}
            type="skill"
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Install Skill to Tools</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-auto p-4">
          {/* Error banner */}
          {writeMutation.isError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {writeMutation.error instanceof Error
                ? writeMutation.error.message
                : String(writeMutation.error)}
            </div>
          )}
          {detectionErrorMessage && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              Could not detect installed tools. Skill installation is blocked
              until detection succeeds.
              <br />
              <span className="text-xs">{detectionErrorMessage}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Skill Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., commit"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              {method === "link" ? (
                <>
                  Canonical location:{" "}
                  <code className="rounded bg-muted px-1">
                    ~/.agents/skills/{name || "name"}/SKILL.md
                  </code>
                </>
              ) : (
                <>
                  Directory name (e.g.,{" "}
                  <code className="rounded bg-muted px-1">
                    ~/.claude/skills/{name || "name"}/SKILL.md
                  </code>
                  )
                </>
              )}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this skill"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="## Instructions&#10;&#10;Your skill content here..."
              rows={10}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Install Method */}
          <InstallMethodSelector method={method} onChange={setMethod} />

          {/* Tool Selector */}
          {isDetectingTools && !detectionErrorMessage && (
            <p className="text-xs text-muted-foreground">
              Detecting installed tools...
            </p>
          )}
          <ToolSelector
            selectedTools={effectiveTargetTools}
            onToolsChange={setTargetTools}
            type="skill"
            availableTools={installedToolIds}
            installMethod={method}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || writeMutation.isPending}
          >
            {writeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Install Skill
          </Button>
        </div>
      </div>
    </div>
  );
}
