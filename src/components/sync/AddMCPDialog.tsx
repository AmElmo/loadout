import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddMCPRequest, MCPType, SourceTool, PreviewConfig } from "@/types";
import { addMCPToTools, previewMCPConfigs } from "@/lib/api/sync";
import { Button } from "@/components/ui/button";
import { ToolSelector } from "./ToolSelector";
import { ConfigPreview } from "./ConfigPreview";
import { SuccessConfirmation } from "./SuccessConfirmation";

interface AddMCPDialogProps {
  onClose: () => void;
}

export function AddMCPDialog({ onClose }: AddMCPDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [mcpType, setMcpType] = useState<MCPType>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState<string[]>([]);
  const [argInput, setArgInput] = useState("");
  const [url, setUrl] = useState("");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [targetTools, setTargetTools] = useState<SourceTool[]>([
    "claude",
    "codex",
    "gemini",
  ]);

  // Preview state
  const [previews, setPreviews] = useState<PreviewConfig[]>([]);
  const isHttpMCP = mcpType === "http";
  const disabledTools: SourceTool[] = isHttpMCP ? ["codex"] : [];
  const effectiveTargetTools = isHttpMCP
    ? targetTools.filter((tool) => tool !== "codex")
    : targetTools;

  const buildRequest = (): AddMCPRequest => ({
    name: name.trim(),
    mcpType,
    command: !isHttpMCP ? command.trim() || null : null,
    args: !isHttpMCP ? args : [],
    url: isHttpMCP ? url.trim() || null : null,
    env: Object.fromEntries(
      envVars
        .filter((v) => v.key.trim())
        .map((v) => [v.key.trim(), v.value])
    ),
    targetTools: effectiveTargetTools,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: previewMCPConfigs,
    onSuccess: (result) => setPreviews(result.configs),
  });

  // Write mutation
  const writeMutation = useMutation({
    mutationFn: addMCPToTools,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
    },
  });

  const handlePreview = () => {
    previewMutation.mutate(buildRequest());
  };

  const handleSubmit = () => {
    writeMutation.mutate(buildRequest());
  };

  const addArg = () => {
    if (argInput.trim()) {
      setArgs([...args, argInput.trim()]);
      setArgInput("");
    }
  };

  const removeArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const isValid =
    name.trim() &&
    effectiveTargetTools.length > 0 &&
    (!isHttpMCP ? command.trim() : url.trim());

  // Show success state
  if (writeMutation.isSuccess && writeMutation.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <SuccessConfirmation
            result={writeMutation.data}
            type="mcp"
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
          <h2 className="text-lg font-semibold">Add MCP to Tools</h2>
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

          {/* MCP Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-3">
              {(["stdio", "http"] as MCPType[]).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    mcpType === t
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="mcpType"
                    value={t}
                    checked={mcpType === t}
                    onChange={() => setMcpType(t)}
                    className="h-4 w-4"
                  />
                  {t === "stdio" ? "stdio (command)" : "http (URL)"}
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., github"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* stdio fields */}
          {!isHttpMCP && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Command</label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g., npx"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arguments</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={argInput}
                    onChange={(e) => setArgInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addArg();
                      }
                    }}
                    placeholder="e.g., -y"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button variant="outline" size="sm" onClick={addArg}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {args.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {args.map((arg, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-xs"
                      >
                        {arg}
                        <button
                          onClick={() => removeArg(i)}
                          className="ml-0.5 rounded-sm hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* http fields */}
          {isHttpMCP && (
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://mcp.linear.app/mcp"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Codex CLI supports only stdio MCP servers, so it is disabled
                for HTTP MCPs.
              </p>
            </div>
          )}

          {/* Environment Variables */}
          {!isHttpMCP && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Environment Variables
                </label>
                <Button variant="ghost" size="sm" onClick={addEnvVar}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {envVars.map((envVar, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={envVar.key}
                    onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                    placeholder="KEY"
                    className="w-1/3 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={envVar.value}
                    onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEnvVar(i)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Tool Selector */}
          <ToolSelector
            selectedTools={effectiveTargetTools}
            onToolsChange={(tools) =>
              setTargetTools(
                isHttpMCP ? tools.filter((tool) => tool !== "codex") : tools
              )
            }
            type="mcp"
            disabledTools={disabledTools}
            disabledReason="Codex CLI only supports stdio MCP servers"
          />

          {/* Preview */}
          {previews.length > 0 && <ConfigPreview previews={previews} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!isValid || previewMutation.isPending}
          >
            Preview Config
          </Button>
          <div className="flex gap-2">
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
              Add MCP
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
