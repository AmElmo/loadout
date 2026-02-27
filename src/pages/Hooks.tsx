import { useMemo, useRef, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { scanHooks } from "@/lib/api/config";
import { HooksSection } from "@/components/config";
import { SearchBar } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useShortcutAction } from "@/hooks/useKeyboardShortcuts";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Hooks() {
  const [searchQuery, setSearchQuery] = useState("");
  const workspace = useWorkspaceStore((s) => s.current);
  const workspacePath = workspace?.path ?? undefined;
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcutAction("focus-search", () => searchRef.current?.focus());

  const {
    data: result,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["hooks", workspacePath ?? null],
    queryFn: () => scanHooks(workspacePath),
  });

  useShortcutAction("refresh", () => refetch());

  const filteredHooks = useMemo(() => {
    if (!result) return [];
    const query = searchQuery.toLowerCase();
    if (!query) return result.hooks;
    return result.hooks.filter(
      (h) =>
        h.event.toLowerCase().includes(query) ||
        h.command.toLowerCase().includes(query) ||
        (h.matcher && h.matcher.toLowerCase().includes(query))
    );
  }, [result, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredHooks);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Hooks</h2>
          <p className="mt-1 text-muted-foreground">
            Lifecycle hooks configured in Claude Code and Gemini CLI
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

      {result && result.hooks.length > 0 && (
        <div className="mb-4">
          <SearchBar
            ref={searchRef}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search hooks..."
          />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to scan hooks</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {result && (
        <>
          <HooksSection
            hooks={visibleItems}
            geminiHooksEnabled={result.geminiHooksEnabled}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </>
      )}
    </div>
  );
}
