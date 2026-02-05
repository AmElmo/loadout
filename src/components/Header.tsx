import { FolderOpen, ChevronDown, GitBranch } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getWorkspaceInfo } from "@/lib/api/workspace";
import { useState } from "react";

export function Header() {
  const { current, recent, setCurrent } = useWorkspaceStore();
  const [showRecent, setShowRecent] = useState(false);

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Workspace",
    });

    if (selected && typeof selected === "string") {
      const info = await getWorkspaceInfo(selected);
      setCurrent(info);
    }
  };

  const handleSelectRecent = async (path: string) => {
    const info = await getWorkspaceInfo(path);
    setCurrent(info);
    setShowRecent(false);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Current workspace indicator */}
      <div className="flex items-center gap-2">
        {current ? (
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{current.name}</span>
            {current.repo_root && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                git
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">No workspace selected</span>
        )}
      </div>

      {/* Workspace selector */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectFolder}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Select Workspace
          </Button>

          {recent.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRecent(!showRecent)}
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Recent workspaces dropdown */}
        {showRecent && recent.length > 0 && (
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-card py-1 shadow-lg">
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Recent Workspaces
            </p>
            {recent.map((path) => {
              const name = path.split("/").pop() || path;
              return (
                <button
                  key={path}
                  onClick={() => handleSelectRecent(path)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
