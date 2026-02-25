import { useCallback, useState } from "react";
import { X, Loader2, AlertCircle, Bot } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentSourceTool, AgentWriteResult } from "@/types";
import { installAgentToTools } from "@/lib/api/agents";
import { Button } from "@/components/ui/button";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/utils";

const AGENT_TOOLS: AgentSourceTool[] = ["claude", "gemini"];

const MODELS = [
  { value: "", label: "Inherit from parent" },
  { value: "haiku", label: "Haiku" },
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
];

interface InstallAgentDialogProps {
  onClose: () => void;
}

export function InstallAgentDialog({ onClose }: InstallAgentDialogProps) {
  const queryClient = useQueryClient();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tools, setTools] = useState("");
  const [model, setModel] = useState("");
  const [maxTurns, setMaxTurns] = useState("");
  const [permissionMode] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [targetTools, setTargetTools] = useState<AgentSourceTool[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const buildContent = (): string => {
    const lines = [];
    lines.push("---");
    lines.push(`name: ${name.trim()}`);
    if (description.trim()) {
      lines.push(`description: ${description.trim()}`);
    }
    if (tools.trim()) {
      lines.push(`tools: ${tools.trim()}`);
    }
    if (model) {
      lines.push(`model: ${model}`);
    }
    if (maxTurns) {
      lines.push(`maxTurns: ${maxTurns}`);
    }
    if (permissionMode) {
      lines.push(`permissionMode: ${permissionMode}`);
    }
    lines.push("---");
    lines.push("");
    lines.push(systemPrompt);
    return lines.join("\n");
  };

  const writeMutation = useMutation({
    mutationFn: () =>
      installAgentToTools({
        filename: name.trim(),
        content: buildContent(),
        scope: "user",
        targetTools,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const isValid =
    name.trim() && systemPrompt.trim() && targetTools.length > 0;

  if (writeMutation.isSuccess) {
    const result = writeMutation.data as AgentWriteResult;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Bot className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Agent Created</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Successfully created{" "}
              <span className="font-medium">{name}</span>
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Add Agent</h2>
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
          {writeMutation.isError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {writeMutation.error instanceof Error
                ? writeMutation.error.message
                : String(writeMutation.error)}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., code-reviewer"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              File:{" "}
              <code className="rounded bg-muted px-1">
                ~/.claude/agents/{name || "name"}.md
              </code>
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
              placeholder="When to use this agent"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Model + Tools row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Model{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Max Turns{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(e.target.value)}
                placeholder="e.g., 50"
                min={1}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Allowed Tools{" "}
              <span className="font-normal text-muted-foreground">
                (optional, comma-separated)
              </span>
            </label>
            <input
              type="text"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              placeholder="e.g., Read, Glob, Grep, Edit"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a code reviewer. When analyzing code, focus on..."
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Preview toggle */}
          {name && systemPrompt && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showPreview ? "Hide Preview" : "Show File Preview"}
              </button>
              {showPreview && (
                <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-xs">
                  {buildContent()}
                </pre>
              )}
            </div>
          )}

          {/* Target Tools */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Install to Tools</label>
            <div className="space-y-2">
              {AGENT_TOOLS.map((tool) => {
                const isSelected = targetTools.includes(tool);
                return (
                  <label
                    key={tool}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetTools([...targetTools, tool]);
                        } else {
                          setTargetTools(
                            targetTools.filter((t) => t !== tool)
                          );
                        }
                      }}
                      className="h-4 w-4 rounded border-border"
                    />
                    <ToolLogo tool={tool} size={14} />
                    <span className="flex-1 text-sm font-medium">
                      {TOOL_CONFIG[tool]?.label ?? tool}
                    </span>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => writeMutation.mutate()}
            disabled={!isValid || writeMutation.isPending}
          >
            {writeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Agent
          </Button>
        </div>
      </div>
    </div>
  );
}
