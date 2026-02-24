import { X, Copy, Check, FolderOpen, Share2, Link2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { GroupedSkill, SkillItem } from "@/types";
import { installSkillToTools } from "@/lib/api/sync";
import { ToolBadges, ToolBadge } from "@/components/mcps/ToolBadge";
import { TokenBadge } from "@/components/context";
import { SyncDialog } from "@/components/sync";
import { MaturityBadge } from "./MaturityBadge";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { OpenPathButton } from "@/components/ui/open-path-button";
import { ALL_TOOLS } from "@/config/tools";
import { cn } from "@/lib/utils";

interface SkillViewerProps {
  group: GroupedSkill;
  onClose: () => void;
}

export function SkillViewer({ group, onClose }: SkillViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [activeVariant, setActiveVariant] = useState<SkillItem>(group.primary);

  const missingTools = ALL_TOOLS.filter((t) => !group.installedTools.includes(t));
  const showVariantTabs = group.hasContentDrift && group.variants.length > 1;

  const isLinked = group.variants.some((v) => v.isSymlinked);
  const hasBrokenSymlink = group.variants.some((v) => v.isBrokenSymlink);
  const canonicalPath = group.variants.find((v) => v.isSymlinked)?.symlinkTarget ?? null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeVariant.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{group.name}</h2>
            <ToolBadges tools={group.installedTools} />
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

        {/* Symlink indicator */}
        {isLinked && (
          <div className="border-b border-border bg-blue-500/5 px-4 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="font-medium text-blue-600">Linked</span>
              {canonicalPath && (
                <span className="truncate font-mono text-muted-foreground" title={canonicalPath}>
                  from {canonicalPath}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Broken symlink warning */}
        {hasBrokenSymlink && (
          <div className="border-b border-border bg-yellow-500/10 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-yellow-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Broken link detected</span>
              <span className="text-muted-foreground">
                — the symlink target no longer exists
              </span>
            </div>
          </div>
        )}

        {/* Context window usage */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-muted-foreground">Context usage:</span>
            <TokenBadge tokens={activeVariant.idleTokens} label="idle" />
            <TokenBadge tokens={activeVariant.activeTokens} label="invoked" />
          </div>
        </div>

        {/* Variant tabs (only when content differs across tools) */}
        {showVariantTabs && (
          <div className="flex gap-1 border-b border-border bg-muted/20 px-4 py-2">
            {group.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setActiveVariant(variant)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  activeVariant.id === variant.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <ToolBadge tool={variant.sourceTool} />
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
        <SyncDialog
          type="skill"
          name={group.name}
          existingTools={group.installedTools}
          onSync={(targetTools, method) =>
            installSkillToTools({
              name: group.name,
              // Sync the currently selected variant to avoid propagating the wrong version.
              content: activeVariant.content,
              targetTools,
              method: method ?? "link",
              files: [],
            })
          }
          onClose={() => setShowSync(false)}
          queryKey="skills"
        />
      )}
    </div>
  );
}
