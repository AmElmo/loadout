import {
  FolderOpen,
  ChevronDown,
  GitBranch,
  Search,
  RefreshCw,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { getWorkspaceInfo, discoverWorkspaces } from "@/lib/api/workspace";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DiscoveredWorkspace } from "@/types";
import { cn } from "@/lib/utils";

const toolColors: Record<string, string> = {
  claude: "bg-orange-500",
  codex: "bg-green-500",
  gemini: "bg-blue-500",
};

function ToolDots({ workspace }: { workspace: DiscoveredWorkspace }) {
  const tools: { name: string; active: boolean }[] = [
    {
      name: "claude",
      active:
        workspace.signals.hasClaudeConfig ||
        workspace.signals.hasClaudePrompt ||
        workspace.signals.hasClaudeSkills,
    },
    {
      name: "codex",
      active:
        workspace.signals.hasCodexConfig ||
        workspace.signals.hasCodexPrompt ||
        workspace.signals.hasCodexSkills,
    },
    {
      name: "gemini",
      active:
        workspace.signals.hasGeminiConfig ||
        workspace.signals.hasGeminiPrompt ||
        workspace.signals.hasGeminiSkills,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {tools
        .filter((t) => t.active)
        .map((t) => (
          <span
            key={t.name}
            className={cn("h-2 w-2 rounded-full", toolColors[t.name])}
            title={t.name}
          />
        ))}
    </div>
  );
}

export function Header() {
  const { current, setCurrent } = useWorkspaceStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-discover workspaces on mount
  const {
    data: discovery,
    isLoading: isDiscovering,
    refetch: rescan,
    isRefetching,
  } = useQuery({
    queryKey: ["discover-workspaces"],
    queryFn: () => discoverWorkspaces(4),
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Workspace",
    });

    if (selected && typeof selected === "string") {
      const info = await getWorkspaceInfo(selected);
      setCurrent(info);
      setShowDropdown(false);
    }
  };

  const handleSelectWorkspace = async (path: string) => {
    const info = await getWorkspaceInfo(path);
    setCurrent(info);
    setShowDropdown(false);
    setFilter("");
  };

  const filteredWorkspaces =
    discovery?.workspaces.filter(
      (ws) =>
        !filter ||
        ws.name.toLowerCase().includes(filter.toLowerCase()) ||
        ws.path.toLowerCase().includes(filter.toLowerCase())
    ) ?? [];

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
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectFolder}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowDropdown(!showDropdown);
              setFilter("");
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            Workspaces
            {discovery && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-medium">
                {discovery.workspaces.length}
              </span>
            )}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Workspace discovery dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-md border border-border bg-card shadow-lg">
            {/* Search filter */}
            <div className="border-b border-border px-3 py-2">
              <input
                type="text"
                placeholder="Filter workspaces..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            {/* Discovered workspaces */}
            <div className="max-h-80 overflow-auto py-1">
              {isDiscovering ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {filter
                    ? "No matching workspaces"
                    : "No AI CLI workspaces found"}
                </p>
              ) : (
                filteredWorkspaces.map((ws) => {
                  const isActive =
                    current?.path === ws.path ||
                    current?.repo_root === ws.path;
                  return (
                    <button
                      key={ws.path}
                      onClick={() => handleSelectWorkspace(ws.path)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent",
                        isActive && "bg-accent"
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {ws.name}
                          </span>
                          {ws.isGitRepo && (
                            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                          <ToolDots workspace={ws} />
                        </div>
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={ws.path}
                        >
                          {ws.path.replace(/^\/Users\/[^/]+/, "~")}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer with rescan + stats */}
            <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
              <span className="text-[10px] text-muted-foreground">
                {discovery &&
                  `${discovery.workspaces.length} found in ${discovery.scanDurationMs}ms`}
              </span>
              <button
                onClick={() => rescan()}
                disabled={isRefetching}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={cn("h-3 w-3", isRefetching && "animate-spin")}
                />
                Rescan
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
