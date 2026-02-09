import { RefreshCw, AlertCircle, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanMCPs } from "@/lib/api/mcps";
import { MCPList } from "@/components/mcps";
import { Button } from "@/components/ui/button";

export function MCPs() {
  const { current } = useWorkspaceStore();

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

      {!current && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>
            Showing user-level MCPs. Select a workspace to also see
            project-level configs.
          </span>
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

      {mcps && <MCPList mcps={mcps} />}

      {mcps && mcps.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Found {mcps.length} MCP server{mcps.length !== 1 ? "s" : ""} across
          your configured tools
        </p>
      )}
    </div>
  );
}
