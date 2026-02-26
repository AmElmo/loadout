import type { PluginItem, PluginSourceVariant, SourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";

const SOURCE_VARIANT_LABELS: Record<PluginSourceVariant, string> = {
  "claude-cli": "Claude Code CLI",
  "claude-desktop": "Claude Desktop",
  "gemini-cli": "Gemini CLI",
};

interface PluginCardProps {
  plugin: PluginItem;
  isSelected: boolean;
  onClick: () => void;
}

export function PluginCard({ plugin, isSelected, onClick }: PluginCardProps) {
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

  const isNonUserScope = plugin.scope !== "user";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "rounded-lg border border-border bg-card p-4 cursor-pointer transition-colors hover:border-primary/30",
        isSelected && "border-primary ring-1 ring-primary/20",
        !plugin.enabled && "opacity-60"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ToolLogo tool={sourceTool} size={14} />
          <h3 className="truncate font-medium">{plugin.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!plugin.enabled && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Disabled
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            v{plugin.version}
          </span>
          {isNonUserScope ? (
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

      {/* Source variant label */}
      <div className="mt-1">
        <span className="text-[11px] text-muted-foreground">{variantLabel}</span>
      </div>

      {/* Description */}
      {plugin.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {plugin.description}
        </p>
      )}

      {/* Component chips */}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
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
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          by {plugin.author}
        </p>
      )}
    </div>
  );
}
