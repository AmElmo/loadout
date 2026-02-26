import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle, FolderOpen, Download, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanAgents } from "@/lib/api/agents";
import { AgentList, AgentConflictWarning } from "@/components/agents";
import { FilterBar, SearchBar } from "@/components/filters";
import { ImportAgentDialog } from "@/components/agents/ImportAgentDialog";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import type { AgentSourceTool, SourceTool } from "@/types";
import { groupAgents } from "@/lib/groupAgents";
import { cn } from "@/lib/utils";

const AGENT_TOOL_ORDER: AgentSourceTool[] = ["claude", "gemini"];

export function Agents() {
  const { current } = useWorkspaceStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [activeTools, setActiveTools] = useState<AgentSourceTool[]>([]);
  const [activeScopes, setActiveScopes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFileContent, setDragFileContent] = useState<string | undefined>();
  const [dragFileName, setDragFileName] = useState<string | undefined>();

  useEffect(() => {
    if (!current) setActiveScopes([]);
  }, [current]);

  const {
    data: result,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["agents", current?.repo_root ?? current?.path ?? null],
    queryFn: () => scanAgents(current?.repo_root ?? current?.path),
  });

  const groupedAgents = useMemo(() => {
    if (!result) return [];
    return groupAgents(result.agents);
  }, [result]);

  const availableTools = useMemo(() => {
    const tools = new Set<AgentSourceTool>();
    for (const group of groupedAgents) {
      for (const t of group.installedTools) tools.add(t);
    }
    return AGENT_TOOL_ORDER.filter((t) => tools.has(t));
  }, [groupedAgents]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return groupedAgents.filter((group) => {
      if (
        activeTools.length > 0 &&
        !group.installedTools.some((t) =>
          (activeTools as string[]).includes(t)
        )
      ) {
        return false;
      }
      if (activeScopes.length > 0 && !activeScopes.includes(group.scope)) {
        return false;
      }
      if (
        query &&
        !group.name.toLowerCase().includes(query) &&
        !group.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [groupedAgents, activeTools, activeScopes, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredAgents);

  const hasActiveFilters =
    activeTools.length > 0 ||
    activeScopes.length > 0 ||
    searchQuery.length > 0;

  function clearFilters() {
    setActiveTools([]);
    setActiveScopes([]);
    setSearchQuery("");
  }

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const mdFile = files.find((f) => f.name.endsWith(".md"));
    if (!mdFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setDragFileContent(content);
        setDragFileName(mdFile.name);
        setShowImportDialog(true);
      }
    };
    reader.readAsText(mdFile);
  };

  const closeDialog = () => {
    setShowImportDialog(false);
    setDragFileContent(undefined);
    setDragFileName(undefined);
  };

  return (
    <div
      className="p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-primary/5 ring-2 ring-inset ring-primary/30">
          <div className="rounded-lg bg-background px-6 py-4 text-sm font-medium shadow-lg">
            Drop <code className="rounded bg-muted px-1">.md</code> subagent file
            to import
          </div>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Subagents</h2>
          <p className="mt-1 text-muted-foreground">
            View and sync subagents across Claude Code and Gemini CLI
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowImportDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            Import Subagent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {!current && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>
            Showing user-level subagents. Select a workspace to also see
            project-level subagents.
          </span>
        </div>
      )}

      {/* Gemini enableAgents warning */}
      {result && !result.geminiAgentsEnabled && result.agents.some((a) => a.sourceTool === "gemini") && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-sm text-yellow-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Gemini subagents found but{" "}
            <code className="rounded bg-yellow-500/10 px-1 font-mono text-xs">
              enableAgents: true
            </code>{" "}
            is not set in{" "}
            <code className="rounded bg-yellow-500/10 px-1 font-mono text-xs">
              ~/.gemini/settings.json
            </code>
            . Gemini subagents may not be active.
          </span>
        </div>
      )}

      {result && groupedAgents.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search subagents..."
          />
          <FilterBar
            activeTools={activeTools as SourceTool[]}
            onToolsChange={(tools) =>
              setActiveTools(tools as AgentSourceTool[])
            }
            activeScopes={activeScopes}
            onScopesChange={setActiveScopes}
            showScopeFilter={!!current}
            availableTools={availableTools as SourceTool[]}
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
            <span className="font-medium">Failed to scan subagents</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {result && (
        <>
          <AgentConflictWarning conflicts={result.conflicts} />
          <AgentList
            agents={visibleItems}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </>
      )}

      {result && groupedAgents.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {filteredAgents.length === groupedAgents.length
            ? `Found ${groupedAgents.length} subagent${groupedAgents.length !== 1 ? "s" : ""} across your configured tools`
            : `Showing ${filteredAgents.length} of ${groupedAgents.length} subagent${groupedAgents.length !== 1 ? "s" : ""}`}
          {result.conflicts.length > 0 && (
            <span className="text-yellow-600">
              {" "}
              ({result.conflicts.length} conflict
              {result.conflicts.length !== 1 ? "s" : ""} detected)
            </span>
          )}
        </p>
      )}

      {showImportDialog && (
        <ImportAgentDialog
          onClose={closeDialog}
          initialFileContent={dragFileContent}
          initialFileName={dragFileName}
        />
      )}
    </div>
  );
}
