import { useMemo, useState } from "react";
import { RefreshCw, AlertCircle, FolderOpen, FolderSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanRules } from "@/lib/api/config";
import { PromptsSection, RepoScanModal } from "@/components/config";
import { SearchBar } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";

export function Rules() {
  const { current } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);

  const {
    data: result,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["rules", current?.repo_root ?? current?.path ?? null],
    queryFn: () => scanRules(current?.repo_root ?? current?.path),
  });

  const filteredPrompts = useMemo(() => {
    if (!result) return [];
    const query = searchQuery.toLowerCase();
    if (!query) return result.prompts;
    return result.prompts.filter(
      (p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query)
    );
  }, [result, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredPrompts);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Rules</h2>
          <p className="mt-1 text-muted-foreground">
            System instructions across tools (CLAUDE.md, AGENTS.md, GEMINI.md)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScanModal(true)}
          >
            <FolderSearch className="mr-2 h-4 w-4" />
            Scan repos without rules
          </Button>
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
      </div>

      {showScanModal && (
        <RepoScanModal onClose={() => setShowScanModal(false)} />
      )}

      {!current && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>
            Showing user-level rules only. Select a workspace to also see
            project-level rules.
          </span>
        </div>
      )}

      {result && result.prompts.some((p) => p.exists) && (
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search rules..."
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
            <span className="font-medium">Failed to scan rules</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {result && (
        <>
          <PromptsSection
            prompts={visibleItems}
            workspaceName={current?.name}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </>
      )}
    </div>
  );
}
