import { X, Copy, Check, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { PromptFile } from "@/types";
import { ToolBadge } from "@/components/mcps/ToolBadge";
import { Button } from "@/components/ui/button";

interface RuleViewerProps {
  rule: PromptFile;
  onClose: () => void;
}

export function RuleViewer({ rule, onClose }: RuleViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rule.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{rule.name}</h2>
            <ToolBadge tool={rule.sourceTool} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {rule.scope}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative min-h-[4rem] flex-1 overflow-auto">
          <div className="absolute right-2 top-2 z-10">
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
          <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-sm">
            {rule.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono" title={rule.path}>
            {rule.path}
          </span>
        </div>
      </div>
    </div>
  );
}
