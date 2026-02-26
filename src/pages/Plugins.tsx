import { useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { scanPlugins } from "@/lib/api/plugins";
import { PluginList, MarketplaceSection } from "@/components/plugins";
import { SearchBar } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";

export function Plugins() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: result,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["plugins", null],
    queryFn: () => scanPlugins(),
  });

  const filteredPlugins = useMemo(() => {
    if (!result) return [];
    const query = searchQuery.toLowerCase();
    if (!query) return result.installed;
    return result.installed.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [result, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredPlugins);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Plugins</h2>
          <p className="mt-1 text-muted-foreground">
            Installed plugins and extensions across Claude Code, Claude Desktop,
            and Gemini CLI
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Search (only when installed plugins exist) */}
      {result && result.installed.length > 0 && (
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search plugins..."
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to scan plugins</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {/* Content */}
      {result && (
        <>
          {/* Installed plugins */}
          <PluginList
            plugins={visibleItems}
            hasActiveFilters={!!searchQuery}
            onClearFilters={() => setSearchQuery("")}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}

          {/* Count */}
          {result.installed.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {result.installed.length} installed plugin
              {result.installed.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Marketplace section */}
          {result.available.length > 0 && (
            <div className="mt-8">
              <MarketplaceSection
                available={result.available}
                marketplaces={result.marketplaces}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
