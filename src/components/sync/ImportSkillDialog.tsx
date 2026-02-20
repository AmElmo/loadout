import { useEffect, useState } from "react";
import { X, Loader2, Globe, FileUp, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import type { FetchedSkill, SourceTool } from "@/types";
import {
  fetchSkillFromUrl,
  parseSkillFileContent,
  readSkillFile,
  installSkillToTools,
} from "@/lib/api/sync";
import { detectInstalledTools } from "@/lib/api/detection";
import { Button } from "@/components/ui/button";
import { ToolSelector } from "./ToolSelector";
import { SuccessConfirmation } from "./SuccessConfirmation";
import { cn } from "@/lib/utils";

type ImportMode = "url" | "file";

interface ImportSkillDialogProps {
  onClose: () => void;
  initialFileContent?: string;
  initialFileName?: string;
}

export function ImportSkillDialog({
  onClose,
  initialFileContent,
  initialFileName,
}: ImportSkillDialogProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<ImportMode>(
    initialFileContent ? "file" : "url"
  );
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<FetchedSkill | null>(null);
  const [editedName, setEditedName] = useState("");
  const [targetTools, setTargetTools] = useState<SourceTool[]>([]);

  // Detect installed tools to pre-select only those
  const { data: detectionResult } = useQuery({
    queryKey: ["installed-tools"],
    queryFn: detectInstalledTools,
  });

  // Set default selected tools once detection completes
  useEffect(() => {
    if (detectionResult && targetTools.length === 0) {
      setTargetTools(detectionResult.tools.map((t) => t.id as SourceTool));
    }
  }, [detectionResult, targetTools.length]);

  // Fetch skill from URL
  const fetchMutation = useMutation({
    mutationFn: fetchSkillFromUrl,
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
    }) => parseSkillFileContent(content, filename),
    onSuccess: (data) => {
      setPreview(data);
      setEditedName(data.name);
    },
  });

  // Read and parse file from path (for file picker)
  const readFileMutation = useMutation({
    mutationFn: readSkillFile,
    onSuccess: (data) => {
      setPreview(data);
      setEditedName(data.name);
    },
  });

  // Install skill
  const installMutation = useMutation({
    mutationFn: installSkillToTools,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
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
      name: editedName.trim(),
      content: preview.content,
      targetTools,
    });
  };

  const isLoading =
    fetchMutation.isPending ||
    parseMutation.isPending ||
    readFileMutation.isPending;
  const fetchError =
    fetchMutation.error || parseMutation.error || readFileMutation.error;
  const canInstall = preview && editedName.trim() && targetTools.length > 0;

  // Show success state
  if (installMutation.isSuccess && installMutation.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
          <SuccessConfirmation
            result={installMutation.data}
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
          <h2 className="text-lg font-semibold">Import Skill</h2>
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
                  <label className="text-sm font-medium">Skill URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFetchUrl();
                      }}
                      placeholder="https://github.com/org/repo/blob/main/SKILL.md"
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
                    Supports GitHub repo URLs, blob URLs, and direct raw URLs to{" "}
                    <code className="rounded bg-muted px-1">.md</code> files
                  </p>
                </div>
              )}

              {/* File mode */}
              {mode === "file" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill File</label>
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
                    Select a SKILL.md file with YAML frontmatter, or any
                    markdown file
                  </p>
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {preview && (
            <>
              <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm text-green-700">
                Skill loaded successfully
                {preview.sourceUrl && (
                  <span className="ml-1 text-xs text-green-600">from URL</span>
                )}
              </div>

              {/* Editable name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Skill Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Directory name for the skill (e.g.,{" "}
                  <code className="rounded bg-muted px-1">
                    ~/.claude/skills/{editedName || "name"}/SKILL.md
                  </code>
                  )
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

              {/* Tool Selector */}
              <ToolSelector
                selectedTools={targetTools}
                onToolsChange={setTargetTools}
                type="skill"
              />

              {/* Reset button */}
              <button
                onClick={() => {
                  setPreview(null);
                  setEditedName("");
                  fetchMutation.reset();
                  parseMutation.reset();
                  readFileMutation.reset();
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Import a different skill
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
              Install Skill
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
