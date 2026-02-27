import type { MarketplacePluginItem } from "@/types";
import { cn } from "@/lib/utils";

interface MarketplacePluginCardProps {
  plugin: MarketplacePluginItem;
}

export function MarketplacePluginCard({ plugin }: MarketplacePluginCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/50 p-4",
        plugin.isInstalled && "opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate font-medium text-sm">{plugin.name}</h4>
        <div className="flex shrink-0 items-center gap-1.5">
          {plugin.isInstalled && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
              Installed
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            v{plugin.version}
          </span>
        </div>
      </div>

      {/* Category */}
      {plugin.category && (
        <div className="mt-1">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {plugin.category}
          </span>
        </div>
      )}

      {/* Description */}
      {plugin.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {plugin.description}
        </p>
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
