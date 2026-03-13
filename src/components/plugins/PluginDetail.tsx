import { X, FolderOpen } from "lucide-react";
import type { PluginItem, PluginSourceVariant } from "@/types";
import { Button } from "@/components/ui/button";
import { revealInFileManager } from "@/lib/api/system";
import { PluginComponentSection } from "./PluginComponentSection";

const SOURCE_VARIANT_LABELS: Record<PluginSourceVariant, string> = {
  "claude-cli": "Claude Code CLI",
  "claude-desktop": "Claude Desktop",
  "gemini-cli": "Gemini CLI",
};

interface PluginDetailProps {
  plugin: PluginItem;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const variantLabel = SOURCE_VARIANT_LABELS[plugin.sourceVariant];

  const handleReveal = () => {
    revealInFileManager(plugin.path).catch(console.error);
  };

  const details = plugin.componentDetails;

  return (
    <div className="mt-4 rounded-lg border border-border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">{plugin.name}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            v{plugin.version}
          </span>
          <span className="text-[11px] text-muted-foreground">{variantLabel}</span>
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
          aria-label="Close detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      {plugin.description && (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-sm text-muted-foreground">{plugin.description}</p>
        </div>
      )}

      {/* Path */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono" title={plugin.path}>
            {plugin.path}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleReveal}>
          Reveal in Finder
        </Button>
      </div>

      {/* Component sections */}
      <div className="space-y-4 p-4">
        {details.commands.length > 0 && (
          <PluginComponentSection
            title="Commands"
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
            <h4 className="mb-2 text-sm font-medium text-foreground">README</h4>
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {plugin.readme}
            </pre>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
