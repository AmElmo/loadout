import { X, Copy, Check, FolderOpen, Crosshair } from "lucide-react";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PromptFile } from "@/types";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { TokenBadge } from "@/components/context";
import { saveFileContent } from "@/lib/api/system";
import { Button } from "@/components/ui/button";
import { DialogOverlay } from "@/components/ui/dialog-overlay";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { OpenPathButton } from "@/components/ui/open-path-button";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface RuleViewerProps {
  rule: PromptFile;
  onClose: () => void;
}

export function RuleViewer({ rule, onClose }: RuleViewerProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const handleSave = async (content: string) => {
    await saveFileContent(rule.path, content);
    queryClient.invalidateQueries({ queryKey: ["rules"] });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rule.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogOverlay onClose={onClose}>
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{rule.name}</h2>
            <ToolBadge tool={rule.sourceTool} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {rule.scope}
            </span>
            {rule.isScoped && (
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                <Crosshair className="h-2.5 w-2.5" />
                scoped
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scoping info */}
        {rule.isScoped && rule.scopedPaths && rule.scopedPaths.length > 0 && (
          <div className="border-b border-border bg-muted/30 px-4 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Crosshair className="h-3 w-3" />
              Applies when working on:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rule.scopedPaths.map((pattern) => (
                <code
                  key={pattern}
                  className="rounded border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-xs font-mono text-teal-600 dark:text-teal-400"
                >
                  {pattern}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* Context window usage */}
        {rule.tokens > 0 && (
          <div className="border-b border-border bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Context usage:</span>
              <TokenBadge tokens={rule.tokens} />
              {rule.isScoped && (
                <span className="text-muted-foreground">(conditional)</span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative min-h-[4rem] flex-1 overflow-hidden">
          <div className="absolute right-2 top-[3.25rem] z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="bg-background"
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <MarkdownPreview
            content={rule.content}
            className="h-full"
            onSave={handleSave}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono" title={rule.path}>
              {rule.path}
            </span>
          </div>
          <OpenPathButton
            path={rule.path}
            variant="outline"
            size="sm"
          />
        </div>
      </div>
    </DialogOverlay>
  );
}
