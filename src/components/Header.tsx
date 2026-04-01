import { useWorkspaceStore } from "@/stores/workspaceStore";
import { ArrowLeft, GitBranch } from "lucide-react";

const tabLabels: Record<string, string> = {
  home: "Home",
  mcps: "MCPs",
  skills: "Skills",
  agents: "Subagents",
  rules: "Rules",
  hooks: "Hooks",
  plugins: "Plugins",
  context: "Context",
  repos: "Repos",
  learn: "Learn",
};

export function Header() {
  const { activeTab, selectedRepo, setSelectedRepo } = useWorkspaceStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {activeTab === "repos" && selectedRepo ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedRepo(null)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Back to repos"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{selectedRepo.name}</h2>
            {selectedRepo.isGitRepo && (
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedRepo.path.replace(/^\/Users\/[^/]+/, "~")}
          </span>
        </div>
      ) : (
        <h2 className="text-lg font-semibold">{tabLabels[activeTab]}</h2>
      )}
    </header>
  );
}
