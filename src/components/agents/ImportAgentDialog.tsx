import { useCallback, useEffect, useState } from "react";
import {
  X,
  Loader2,
  Globe,
  FileUp,
  AlertCircle,
  Bot,
  Cpu,
  Repeat,
  Shield,
  Wrench,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import type { AgentSourceTool, AgentWriteResult, FetchedAgent } from "@/types";
import {
  fetchAgentFromUrl,
  readAgentFile,
  parseAgentFileContent,
  installAgentToTools,
} from "@/lib/api/agents";
import { Button } from "@/components/ui/button";
import { DialogOverlay } from "@/components/ui/dialog-overlay";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useSubmitShortcut } from "@/hooks/useSubmitShortcut";
import { useWorkspaceStore } from "@/stores/workspaceStore";

type ImportMode = "url" | "file";

const AGENT_TOOLS: AgentSourceTool[] = ["claude", "gemini"];

interface ImportAgentDialogProps {
  onClose: () => void;
  initialFileContent?: string;
  initialFileName?: string;
}

export function ImportAgentDialog({
  onClose,
  initialFileContent,
  initialFileName,
}: ImportAgentDialogProps) {
  const queryClient = useQueryClient();
  const { current } = useWorkspaceStore();
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const [mode, setMode] = useState<ImportMode>(
    initialFileContent ? "file" : "url"
  );
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<FetchedAgent | null>(null);
  const [editedName, setEditedName] = useState("");
  const [targetTools, setTargetTools] = useState<AgentSourceTool[]>([]);

  // Fetch agent from URL
  const fetchMutation = useMutation({
    mutationFn: fetchAgentFromUrl,
    onSuccess: (data) => {
      setPreview(data);
      setEditedName(data.name);
    },
  });

  // Parse file content (for drag-and-drop)
  const parseMutation = useMutation({
    mutationFn: ({
      content,
      filename,
    }: {
      content: string;
      filename: string;
    }) => parseAgentFileContent(content, filename),
    onSuccess: (data) => {
      setPreview(data);
      setEditedName(data.name);
    },
  });

  // Read and parse file from path (for file picker)
  const readFileMutation = useMutation({
    mutationFn: readAgentFile,
    onSuccess: (data) => {
      setPreview(data);
      setEditedName(data.name);
    },
  });

  // Install agent
  const installMutation = useMutation({
    mutationFn: installAgentToTools,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  // Handle initial file content from drag-and-drop
  useEffect(() => {
    if (initialFileContent && initialFileName) {
      parseMutation.mutate({
        content: initialFileContent,
        filename: initialFileName,
      });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchUrl = () => {
    if (!url.trim()) return;
    fetchMutation.mutate(url.trim());
  };

  const handlePickFile = async () => {
    const path = await open({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      multiple: false,
    });
    if (!path) return;
    readFileMutation.mutate(path);
  };

  const handleInstall = () => {
    if (!preview) return;
    installMutation.mutate({
      filename: editedName.trim(),
      content: preview.content,
      scope: "user",
      targetTools,
      workspacePath: current?.path,
    });
  };

  const isLoading =
    fetchMutation.isPending ||
    parseMutation.isPending ||
    readFileMutation.isPending;
  const fetchError =
    fetchMutation.error || parseMutation.error || readFileMutation.error;
  const canInstall = preview && editedName.trim() && targetTools.length > 0;

  useSubmitShortcut(handleInstall, !!canInstall && !installMutation.isPending && !installMutation.isSuccess);

  // Show success state
  if (installMutation.isSuccess && installMutation.data) {
    const result = installMutation.data as AgentWriteResult;
    return (
      <DialogOverlay onClose={onClose}>
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <div className="text-center">
            <div
              className={cn(
                "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                result.success ? "bg-green-500/10" : "bg-red-500/10"
              )}
            >
              {result.success ? (
                <Bot className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {result.success ? "Subagent Installed" : "Subagent Installation Failed"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.success ? (
                <>
                  Successfully installed{" "}
                  <span className="font-medium">{editedName}</span>
                </>
              ) : (
                <>
                  Failed to install{" "}
                  <span className="font-medium">{editedName}</span> to some
                  tools
                </>
              )}
            </p>
            {result.modifiedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.modifiedFiles.map((f) => (
                  <p
                    key={f}
                    className="truncate font-mono text-xs text-muted-foreground"
                  >
                    {f.replace(/^\/Users\/[^/]+/, "~")}
                  </p>
                ))}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((e) => (
                  <p key={e} className="text-xs text-red-600">
                    {e}
                  </p>
                ))}
              </div>
            )}
            <Button className="mt-4" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </DialogOverlay>
    );
  }

  return (
    <DialogOverlay onClose={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Import Subagent</h2>
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
          {(fetchError || installMutation.isError) && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {fetchError instanceof Error
                  ? fetchError.message
                  : installMutation.error instanceof Error
                    ? installMutation.error.message
                    : String(fetchError || installMutation.error)}
              </span>
            </div>
          )}

          {/* Mode tabs (only show when no preview yet) */}
          {!preview && (
            <>
              <div className="flex gap-1 rounded-lg border border-border p-1">
                <button
                  onClick={() => setMode("url")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "url"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Globe className="h-4 w-4" />
                  From URL
                </button>
                <button
                  onClick={() => setMode("file")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "file"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileUp className="h-4 w-4" />
                  From File
                </button>
              </div>

              {/* URL mode */}
              {mode === "url" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subagent URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFetchUrl();
                      }}
                      placeholder="https://github.com/org/repo/blob/main/agents/code-reviewer.md"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      onClick={handleFetchUrl}
                      disabled={!url.trim() || isLoading}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Fetch
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports GitHub blob URLs and direct raw URLs to{" "}
                    <code className="rounded bg-muted px-1">.md</code> subagent
                    files
                  </p>
                </div>
              )}

              {/* File mode */}
              {mode === "file" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subagent File</label>
                  <button
                    onClick={handlePickFile}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <FileUp className="h-5 w-5" />
                    )}
                    <span>
                      {isLoading ? "Parsing..." : "Click to select a .md file"}
                    </span>
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Select a subagent <code className="rounded bg-muted px-1">.md</code> file
                    with YAML frontmatter, or any markdown file
                  </p>
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {preview && (
            <>
              <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm text-green-700">
                Subagent loaded successfully
                {preview.sourceUrl && (
                  <span className="ml-1 text-xs text-green-600">from URL</span>
                )}
              </div>

              {/* Editable name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subagent Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Installed to{" "}
                  <code className="rounded bg-muted px-1">
                    ~/.claude/agents/{editedName || "name"}.md
                  </code>
                </p>
              </div>

              {/* Description */}
              {preview.description && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-sm">{preview.description}</p>
                </div>
              )}

              {/* Metadata badges */}
              {(preview.model ||
                preview.maxTurns ||
                preview.tools ||
                preview.permissionMode) && (
                <div className="flex flex-wrap gap-2">
                  {preview.model && (
                    <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                      <Cpu className="h-3 w-3" />
                      {preview.model}
                    </span>
                  )}
                  {preview.maxTurns && (
                    <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                      <Repeat className="h-3 w-3" />
                      {preview.maxTurns} turns
                    </span>
                  )}
                  {preview.permissionMode && (
                    <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                      <Shield className="h-3 w-3" />
                      {preview.permissionMode}
                    </span>
                  )}
                  {preview.tools && (
                    <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                      <Wrench className="h-3 w-3" />
                      {preview.tools}
                    </span>
                  )}
                </div>
              )}

              {/* Content preview */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Content Preview
                </label>
                <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
                  {preview.content.length > 2000
                    ? preview.content.slice(0, 2000) + "\n..."
                    : preview.content}
                </pre>
              </div>

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
                    title="Codex CLI does not support subagents"
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

              {/* Reset button */}
              <button
                onClick={() => {
                  setPreview(null);
                  setEditedName("");
                  setTargetTools([]);
                  fetchMutation.reset();
                  parseMutation.reset();
                  readFileMutation.reset();
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Import a different subagent
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {preview && (
            <Button
              onClick={handleInstall}
              disabled={!canInstall || installMutation.isPending}
            >
              {installMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Install Subagent
            </Button>
          )}
        </div>
      </div>
    </DialogOverlay>
  );
}
