import { X, Copy, Check, FolderOpen, Share2, Bot } from "lucide-react";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GroupedAgent, AgentItem, AgentSourceTool } from "@/types";
import { saveFileContent } from "@/lib/api/system";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG } from "@/config/tools";
import { MaturityBadge } from "@/components/skills/MaturityBadge";
import { AgentSyncDialog } from "./AgentSyncDialog";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { OpenPathButton } from "@/components/ui/open-path-button";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const AGENT_TOOLS: AgentSourceTool[] = ["claude", "gemini"];

interface AgentViewerProps {
  group: GroupedAgent;
  onClose: () => void;
}

export function AgentViewer({ group, onClose }: AgentViewerProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);
  const [activeVariant, setActiveVariant] = useState<AgentItem>(group.primary);

  const handleSave = async (body: string) => {
    await saveFileContent(activeVariant.path, body);
    queryClient.invalidateQueries({ queryKey: ["agents"] });
  };

  const missingTools = AGENT_TOOLS.filter(
    (t) => !group.installedTools.includes(t)
  );
  const showVariantTabs = group.hasContentDrift && group.variants.length > 1;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeVariant.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold">{group.name}</h2>
            <div className="flex gap-0.5">
              {group.installedTools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                >
                  <ToolLogo tool={tool} size={10} />
                  {TOOL_CONFIG[tool]?.label ?? tool}
                </span>
              ))}
            </div>
            <MaturityBadge maturity={group.maturity} />
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {group.scope}
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

        {/* Description */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </div>

        {/* Agent metadata (model, tools, maxTurns, permissionMode) */}
        {(activeVariant.model ||
          activeVariant.tools ||
          activeVariant.maxTurns ||
          activeVariant.permissionMode) && (
          <div className="flex flex-wrap gap-3 border-b border-border bg-muted/20 px-4 py-2">
            {activeVariant.model && (
              <div className="flex items-center gap-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  Model:
                </span>
                <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-medium text-purple-600">
                  {activeVariant.model}
                </span>
              </div>
            )}
            {activeVariant.maxTurns && (
              <div className="flex items-center gap-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  Max Turns:
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                  {activeVariant.maxTurns}
                </span>
              </div>
            )}
            {activeVariant.permissionMode && (
              <div className="flex items-center gap-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  Permissions:
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                  {activeVariant.permissionMode}
                </span>
              </div>
            )}
            {activeVariant.tools && (
              <div className="flex items-center gap-1 text-xs">
                <span className="font-medium text-muted-foreground">
                  Tools:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeVariant.tools.split(",").map((tool) => (
                    <span
                      key={tool.trim()}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {tool.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Variant tabs (only when content differs across tools) */}
        {showVariantTabs && (
          <div className="flex gap-1 border-b border-border bg-muted/20 px-4 py-2">
            {group.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setActiveVariant(variant)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                  activeVariant.id === variant.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <ToolLogo tool={variant.sourceTool} size={10} />
                {TOOL_CONFIG[variant.sourceTool]?.label ?? variant.sourceTool}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
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
            content={activeVariant.content}
            className="h-full"
            onSave={handleSave}
            onClose={onClose}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono" title={activeVariant.path}>
              {activeVariant.path}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <OpenPathButton
              path={activeVariant.path}
              variant="outline"
              size="sm"
            />
            {missingTools.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSync(true)}
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Sync to Other Tools
              </Button>
            )}
          </div>
        </div>
      </div>

      {showSync && (
        <AgentSyncDialog
          group={group}
          onClose={() => setShowSync(false)}
        />
      )}
    </div>
  );
}
