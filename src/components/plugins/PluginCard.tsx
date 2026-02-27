import { ChevronRight } from "lucide-react";
import type { PluginItem, PluginSourceVariant, SourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";
import { toolAccentColor } from "@/config/tools";

const SOURCE_VARIANT_LABELS: Record<PluginSourceVariant, string> = {
  "claude-cli": "Claude Code CLI",
  "claude-desktop": "Claude Desktop",
  "gemini-cli": "Gemini CLI",
};

interface PluginCardProps {
  plugin: PluginItem;
  onClick: () => void;
}

export function PluginCard({ plugin, onClick }: PluginCardProps) {
  const variantLabel = SOURCE_VARIANT_LABELS[plugin.sourceVariant];
  const sourceTool = plugin.sourceTool as SourceTool;

  const chips: string[] = [];
  if (plugin.components.commands > 0) {
    chips.push(`${plugin.components.commands} command${plugin.components.commands !== 1 ? "s" : ""}`);
  }
  if (plugin.components.skills > 0) {
    chips.push(`${plugin.components.skills} skill${plugin.components.skills !== 1 ? "s" : ""}`);
  }
  if (plugin.components.mcps > 0) {
    chips.push(`${plugin.components.mcps} MCP${plugin.components.mcps !== 1 ? "s" : ""}`);
  }
  if (plugin.components.hooks > 0) {
    chips.push(`${plugin.components.hooks} hook${plugin.components.hooks !== 1 ? "s" : ""}`);
  }
  if (plugin.components.agents > 0) {
    chips.push(`${plugin.components.agents} agent${plugin.components.agents !== 1 ? "s" : ""}`);
  }
  if (plugin.components.lspServers > 0) {
    chips.push(`${plugin.components.lspServers} LSP server${plugin.components.lspServers !== 1 ? "s" : ""}`);
  }

  const accentHex = toolAccentColor(sourceTool);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card",
        !plugin.enabled && "opacity-60"
      )}
    >
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accentHex }} aria-hidden="true" />
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 p-5 pl-[23px] text-left transition-colors hover:bg-muted/30"
      >
        {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <ToolLogo tool={sourceTool} size={14} />
          <h3 className="truncate font-medium">{plugin.name}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {!plugin.enabled && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Disabled
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{plugin.version}
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
          </div>
        </div>

        {/* Source variant */}
        <div className="mt-0.5">
          <span className="text-[11px] text-muted-foreground">{variantLabel}</span>
        </div>

        {/* Description */}
        {plugin.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {plugin.description}
          </p>
        )}

        {/* Component chips */}
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Author */}
        {plugin.author && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            by {plugin.author}
          </p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
    </div>
  );
}
