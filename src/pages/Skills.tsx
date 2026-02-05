import { Sparkles } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Skills() {
  const { current } = useWorkspaceStore();

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Skills</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Select a workspace to view installed skills across Claude Code, Codex
          CLI, and Gemini CLI.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Skills</h2>
        <p className="mt-1 text-muted-foreground">
          View and manage skills across all tools
        </p>
      </div>

      {/* Placeholder for Skills list - will be implemented in Issue 3 */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          Skills scanner will be implemented in Issue 3.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace: {current.name}
        </p>
      </div>
    </div>
  );
}
