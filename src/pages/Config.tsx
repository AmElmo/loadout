import { Settings } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Config() {
  const { current } = useWorkspaceStore();

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Config</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Select a workspace to view system prompts, hooks, experiment flags,
          and the reality panel.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Config</h2>
        <p className="mt-1 text-muted-foreground">
          System prompts, hooks, and settings
        </p>
      </div>

      {/* Placeholder for Config sections - will be implemented in later issues */}
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Settings className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          Config viewer will be implemented in later issues.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace: {current.name}
        </p>
      </div>
    </div>
  );
}
