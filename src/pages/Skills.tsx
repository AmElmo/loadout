import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle, FolderOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanSkills } from "@/lib/api/skills";
import { SkillList, ConflictWarning } from "@/components/skills";
import { FilterBar, SearchBar } from "@/components/filters";
import { InstallSkillDialog } from "@/components/sync";
import { Button } from "@/components/ui/button";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import type { SourceTool } from "@/types";

export function Skills() {
  const { current } = useWorkspaceStore();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [activeTools, setActiveTools] = useState<SourceTool[]>([]);
  const [activeScopes, setActiveScopes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
    queryKey: ["skills", current?.repo_root ?? current?.path ?? null],
    queryFn: () => scanSkills(current?.repo_root ?? current?.path),
  });

  const filteredSkills = useMemo(() => {
    if (!result) return [];
    const query = searchQuery.toLowerCase();
    return result.skills.filter((skill) => {
      if (activeTools.length > 0 && !activeTools.includes(skill.sourceTool)) {
        return false;
      }
      if (activeScopes.length > 0 && !activeScopes.includes(skill.scope)) {
        return false;
      }
      if (query && !skill.name.toLowerCase().includes(query) && !skill.description?.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [result, activeTools, activeScopes, searchQuery]);

  const { visibleItems, hasMore, sentinelRef } = useInfiniteList(filteredSkills);

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
          <h2 className="text-2xl font-semibold">Skills</h2>
          <p className="mt-1 text-muted-foreground">
            View skills configured across Claude Code, Codex CLI, and Gemini CLI
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowInstallDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Install Skill
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
            Showing user-level skills. Select a workspace to also see
            project-level skills.
          </span>
        </div>
      )}

      {result && result.skills.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search skills..."
          />
          <FilterBar
            activeTools={activeTools}
            onToolsChange={setActiveTools}
            activeScopes={activeScopes}
            onScopesChange={setActiveScopes}
            showScopeFilter={!!current}
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
            <span className="font-medium">Failed to scan skills</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {result && (
        <>
          <ConflictWarning conflicts={result.conflicts} />
          <SkillList
            skills={visibleItems}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </>
      )}

      {result && result.skills.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {filteredSkills.length === result.skills.length
            ? `Found ${result.skills.length} skill${result.skills.length !== 1 ? "s" : ""} across your configured tools`
            : `Showing ${filteredSkills.length} of ${result.skills.length} skill${result.skills.length !== 1 ? "s" : ""}`}
          {result.conflicts.length > 0 && (
            <span className="text-yellow-600">
              {" "}
              ({result.conflicts.length} conflict
              {result.conflicts.length !== 1 ? "s" : ""} detected)
            </span>
          )}
        </p>
      )}
      {showInstallDialog && (
        <InstallSkillDialog onClose={() => setShowInstallDialog(false)} />
      )}
    </div>
  );
}
