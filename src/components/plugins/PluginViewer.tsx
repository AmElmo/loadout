import {
  X,
  FolderOpen,
  Zap,
  Hammer,
  Unplug,
  Anchor,
  Bot,
  FileCode2,
  BookOpen,
} from "lucide-react";
import { useCallback } from "react";
import type { PluginItem, PluginSourceVariant, SourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { OpenPathButton } from "@/components/ui/open-path-button";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { DialogOverlay } from "@/components/ui/dialog-overlay";
import { PluginComponentSection } from "./PluginComponentSection";

const SOURCE_VARIANT_LABELS: Record<PluginSourceVariant, string> = {
  "claude-cli": "Claude Code CLI",
  "claude-desktop": "Claude Desktop",
  "gemini-cli": "Gemini CLI",
};

interface PluginViewerProps {
  plugin: PluginItem;
  onClose: () => void;
}

export function PluginViewer({ plugin, onClose }: PluginViewerProps) {
  const stableOnClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(stableOnClose);

  const variantLabel = SOURCE_VARIANT_LABELS[plugin.sourceVariant];
  const sourceTool = plugin.sourceTool as SourceTool;
  const details = plugin.componentDetails;

  return (
    <DialogOverlay onClose={onClose}>
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <ToolLogo tool={sourceTool} size={14} />
            <h2 className="text-lg font-semibold">{plugin.name}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{plugin.version}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {variantLabel}
            </span>
            {plugin.scope !== "user" ? (
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                {plugin.scope}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {plugin.scope}
              </span>
            )}
            {!plugin.enabled && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Disabled
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

        {/* Description */}
        {plugin.description && (
          <div className="border-b border-border bg-muted/30 px-4 py-2">
            <p className="text-sm text-muted-foreground">
              {plugin.description}
            </p>
          </div>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap gap-4 border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          {plugin.author && (
            <div>
              <span className="font-medium">Author:</span> {plugin.author}
            </div>
          )}
          {plugin.category && (
            <div>
              <span className="font-medium">Category:</span> {plugin.category}
            </div>
          )}
          {plugin.marketplace && (
            <div>
              <span className="font-medium">Marketplace:</span>{" "}
              {plugin.marketplace}
            </div>
          )}
          {plugin.installedAt && (
            <div>
              <span className="font-medium">Installed:</span>{" "}
              {new Date(plugin.installedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {details.commands.length > 0 && (
              <PluginComponentSection
                title="Commands"
                icon={<Zap className="h-4 w-4" />}
                items={details.commands}
                columns={[
                  { key: "name", label: "Name" },
                  { key: "description", label: "Description" },
                ]}
              />
            )}

            {details.skills.length > 0 && (
              <PluginComponentSection
                title="Skills"
                icon={<Hammer className="h-4 w-4" />}
                items={details.skills}
                columns={[
                  { key: "name", label: "Name" },
                  { key: "description", label: "Description" },
                ]}
                expandableKey="content"
              />
            )}

            {details.mcps.length > 0 && (
              <PluginComponentSection
                title="MCP Servers"
                icon={<Unplug className="h-4 w-4" />}
                items={details.mcps}
                columns={[
                  { key: "name", label: "Name" },
                  { key: "mcpType", label: "Type" },
                  { key: "command", label: "Command" },
                ]}
              />
            )}

            {details.hooks.length > 0 && (
              <PluginComponentSection
                title="Hooks"
                icon={<Anchor className="h-4 w-4" />}
                items={details.hooks}
                columns={[
                  { key: "event", label: "Event" },
                  { key: "matcher", label: "Matcher" },
                  { key: "command", label: "Command" },
                ]}
              />
            )}

            {details.agents.length > 0 && (
              <PluginComponentSection
                title="Agents"
                icon={<Bot className="h-4 w-4" />}
                items={details.agents}
                columns={[
                  { key: "name", label: "Name" },
                  { key: "description", label: "Description" },
                ]}
              />
            )}

            {details.lspServers.length > 0 && (
              <PluginComponentSection
                title="LSP Servers"
                icon={<FileCode2 className="h-4 w-4" />}
                items={details.lspServers}
                columns={[
                  { key: "language", label: "Language" },
                  { key: "command", label: "Command" },
                ]}
              />
            )}

            {/* README */}
            {plugin.readme && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">
                    README
                  </h4>
                </div>
                <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {plugin.readme}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono" title={plugin.path}>
              {plugin.path}
            </span>
          </div>
          <OpenPathButton path={plugin.path} variant="outline" size="sm" />
        </div>
      </div>
    </DialogOverlay>
  );
}
