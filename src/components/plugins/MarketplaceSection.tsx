import type { MarketplacePluginItem, MarketplaceInfo } from "@/types";
import { MarketplacePluginCard } from "./MarketplacePluginCard";

interface MarketplaceSectionProps {
  available: MarketplacePluginItem[];
  marketplaces: MarketplaceInfo[];
}

export function MarketplaceSection({
  available,
  marketplaces,
}: MarketplaceSectionProps) {
  // Group available plugins by marketplace name
  const byMarketplace = new Map<string, MarketplacePluginItem[]>();
  for (const plugin of available) {
    const existing = byMarketplace.get(plugin.marketplace) ?? [];
    existing.push(plugin);
    byMarketplace.set(plugin.marketplace, existing);
  }

  // Build marketplace name -> MarketplaceInfo lookup for metadata
  const marketplaceInfo = new Map<string, MarketplaceInfo>();
  for (const info of marketplaces) {
    marketplaceInfo.set(info.name, info);
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Available from Marketplace</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Plugins available from your registered marketplaces
        </p>
      </div>

      <div className="space-y-6">
        {Array.from(byMarketplace.entries()).map(([marketplaceName, plugins]) => {
          const info = marketplaceInfo.get(marketplaceName);
          return (
            <div key={marketplaceName}>
              <div className="mb-3 flex items-center gap-2">
                <h4 className="text-sm font-medium">{marketplaceName}</h4>
                {info?.lastUpdated && (
                  <span className="text-[11px] text-muted-foreground">
                    Updated {new Date(info.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plugins.map((plugin) => (
                  <MarketplacePluginCard
                    key={`${plugin.marketplace}:${plugin.name}`}
                    plugin={plugin}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        These plugins are available from your registered marketplaces. Install
        them from Claude Code CLI (<code className="rounded bg-muted px-1">/plugin install</code>)
        or Claude Desktop.
      </p>
    </div>
  );
}
