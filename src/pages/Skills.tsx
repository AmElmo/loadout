import { RefreshCw, AlertCircle, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanSkills } from "@/lib/api/skills";
import { SkillList, ConflictWarning } from "@/components/skills";
import { Button } from "@/components/ui/button";

export function Skills() {
  const { current } = useWorkspaceStore();

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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Skills</h2>
          <p className="mt-1 text-muted-foreground">
            View skills configured across Claude Code, Codex CLI, and Gemini CLI
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
            Showing user-level skills. Select a workspace to also see
            project-level skills.
          </span>
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
          <SkillList skills={result.skills} />
        </>
      )}

      {result && result.skills.length > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Found {result.skills.length} skill
          {result.skills.length !== 1 ? "s" : ""} across your configured tools
          {result.conflicts.length > 0 && (
            <span className="text-yellow-600">
              {" "}
              ({result.conflicts.length} conflict
              {result.conflicts.length !== 1 ? "s" : ""} detected)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
