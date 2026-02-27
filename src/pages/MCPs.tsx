import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertCircle, FolderOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanMCPs } from "@/lib/api/mcps";
import { MCPList } from "@/components/mcps";
import { FilterBar, SearchBar } from "@/components/filters";
import { AddMCPDialog } from "@/components/sync";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useShortcutAction } from "@/hooks/useKeyboardShortcuts";
import type { SourceTool } from "@/types";
import { ALL_TOOLS } from "@/config/tools";

export function MCPs() {
  const { current } = useWorkspaceStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcutAction("focus-search", () => searchRef.current?.focus());
  useShortcutAction("add-item", () => setShowAddDialog(true));
  const [activeTools, setActiveTools] = useState<SourceTool[]>([]);
  const [activeScopes, setActiveScopes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!current) setActiveScopes([]);
  }, [current]);

  const {
    data: mcps,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["mcps", current?.repo_root ?? current?.path ?? null],
    queryFn: () => scanMCPs(current?.repo_root ?? current?.path),
  });

  useShortcutAction("refresh", () => refetch());

  const availableTools = useMemo(() => {
    if (!mcps) return [];
    const tools = new Set<SourceTool>();
    for (const mcp of mcps) {
      for (const t of mcp.configuredIn) tools.add(t);
    }
    return ALL_TOOLS.filter((t) => tools.has(t));
  }, [mcps]);

  const filteredMcps = useMemo(() => {
    if (!mcps) return [];
    const query = searchQuery.toLowerCase();
    return mcps.filter((mcp) => {
      if (
        activeTools.length > 0 &&
        !activeTools.some((t) => mcp.configuredIn.includes(t))
      ) {
        return false;
      }
      if (activeScopes.length > 0) {
        const scopeValue =
          mcp.scope === "project" || mcp.scope === "repo" ? "project" : "user";
        if (!activeScopes.includes(scopeValue)) return false;
      }
      if (query && !mcp.name.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [mcps, activeTools, activeScopes, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredMcps);

  const hasActiveFilters = activeTools.length > 0 || activeScopes.length > 0 || searchQuery.length > 0;

  function clearFilters() {
    setActiveTools([]);
    setActiveScopes([]);
    setSearchQuery("");
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">MCP Registry</h2>
          <p className="mt-1 text-muted-foreground">
            View MCP servers configured across Claude Code, Codex CLI, and
            Gemini CLI
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add MCP
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

      {!current && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>
            Showing user-level MCPs. Select a workspace to also see
            project-level configs.
          </span>
        </div>
      )}

      {mcps && mcps.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <SearchBar
            ref={searchRef}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search MCPs..."
          />
          <FilterBar
            activeTools={activeTools}
            onToolsChange={setActiveTools}
            activeScopes={activeScopes}
            onScopesChange={setActiveScopes}
            showScopeFilter={!!current}
            availableTools={availableTools}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-4">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to scan MCPs</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {mcps && (
        <>
          <MCPList
            mcps={visibleItems}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </>
      )}

      {mcps && mcps.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {filteredMcps.length === mcps.length
            ? `Found ${mcps.length} MCP server${mcps.length !== 1 ? "s" : ""} across your configured tools`
            : `Showing ${filteredMcps.length} of ${mcps.length} MCP server${mcps.length !== 1 ? "s" : ""}`}
        </p>
      )}

      {showAddDialog && (
        <AddMCPDialog onClose={() => setShowAddDialog(false)} />
      )}
    </div>
  );
}
