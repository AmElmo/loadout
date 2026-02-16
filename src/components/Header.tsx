import { useWorkspaceStore } from "@/stores/workspaceStore";
import { FolderOpen, GitBranch } from "lucide-react";

const tabLabels: Record<string, string> = {
  mcps: "MCPs",
  skills: "Skills",
  rules: "Rules",
  hooks: "Hooks",
  context: "Context",
};

export function Header() {
  const { activeTab, current } = useWorkspaceStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <h2 className="text-lg font-semibold">{tabLabels[activeTab]}</h2>

      {current && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{current.name}</span>
          {current.repo_root && (
            <span className="flex items-center gap-1 text-xs">
              <GitBranch className="h-3 w-3" />
              git
            </span>
          )}
        </div>
      )}
    </header>
  );
}
