import {
  Home,
  Unplug,
  Hammer,
  Bot,
  FileText,
  Anchor,
  Puzzle,
  BarChart3,
  BookOpen,
  FolderOpen,
  ChevronDown,
  GitBranch,
  Search,
  RefreshCw,
  Settings,
  Keyboard,
  Sun,
  Moon,
  Monitor,
  X,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { getVersion } from "@tauri-apps/api/app";
import { cn, isRealWorkspace } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useShortcutStore } from "@/stores/shortcutStore";
import { getWorkspaceInfo, discoverWorkspaces } from "@/lib/api/workspace";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DiscoveredWorkspace, SourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { useThemeStore } from "@/stores/themeStore";
import { TOOL_CONFIG, toolTextColor } from "@/config/tools";

const themeOptions = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

const navItems = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "mcps" as const, label: "MCPs", icon: Unplug },
  { id: "skills" as const, label: "Skills", icon: Hammer },
  { id: "rules" as const, label: "Rules", icon: FileText },
  { id: "agents" as const, label: "Subagents", icon: Bot },
  { id: "hooks" as const, label: "Hooks", icon: Anchor },
  { id: "plugins" as const, label: "Plugins", icon: Puzzle },
  { id: "context" as const, label: "Context", icon: BarChart3 },
];

function ToolDots({ workspace }: { workspace: DiscoveredWorkspace }) {
  const s = workspace.signals;
  const tools: { name: SourceTool; active: boolean }[] = [
    { name: "claude", active: s.hasClaudeConfig || s.hasClaudePrompt || s.hasClaudeSkills },
    { name: "codex", active: s.hasCodexConfig || s.hasCodexPrompt || s.hasCodexSkills },
    { name: "gemini", active: s.hasGeminiConfig || s.hasGeminiPrompt || s.hasGeminiSkills },
    { name: "cursor", active: s.hasCursorConfig },
    { name: "copilot", active: s.hasCopilotConfig },
    { name: "windsurf", active: s.hasWindsurfConfig },
    { name: "roo", active: s.hasRooConfig },
    { name: "cline", active: s.hasClineConfig },
    { name: "kilo", active: s.hasKiloConfig },
    { name: "opencode", active: s.hasOpenCodeConfig },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {tools
        .filter((t) => t.active)
        .map((t) => (
          <span
            key={t.name}
            className={toolTextColor(t.name)}
            title={TOOL_CONFIG[t.name].label}
          >
            <ToolLogo tool={t.name} size={9} />
          </span>
        ))}
    </div>
  );
}

const isMac = navigator.platform.toUpperCase().includes("MAC");

function SettingsMenu({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const setShowShortcutsModal = useShortcutStore(
    (s) => s.setShowShortcutsModal
  );
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">v{version}</p>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            open && "bg-sidebar-accent text-sidebar-foreground"
          )}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border border-border bg-card py-1 shadow-lg">
          <button
            onClick={() => {
              setShowShortcutsModal(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent"
          >
            <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">Keyboard Shortcuts</span>
            <span className="text-[10px] text-muted-foreground">
              {isMac ? "\u2318" : "Ctrl"}+/
            </span>
          </button>
          <div className="mx-2 my-1 border-t border-border" />
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-sm">Theme</span>
            <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  title={label}
                  className={cn(
                    "rounded-sm p-1 transition-colors",
                    theme === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MIN_WIDTH = 120;
const MAX_WIDTH = 400;

export function Sidebar() {
  const { activeTab, setActiveTab, current, setCurrent, sidebarWidth, setSidebarWidth } =
    useWorkspaceStore();
  const showWorkspaceSwitcher = useShortcutStore((s) => s.showWorkspaceSwitcher);
  const setShowWorkspaceSwitcher = useShortcutStore((s) => s.setShowWorkspaceSwitcher);
  const [showDropdown, setShowDropdownLocal] = useState(false);
  const [filter, setFilter] = useState("");
  const [isResizing, setIsResizing] = useState(false);

  // Sync local dropdown state with shortcut store (for Cmd+K)
  // Sync local dropdown state with shortcut store (for Cmd+K)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external store state
    setShowDropdownLocal(showWorkspaceSwitcher);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (showWorkspaceSwitcher) setFilter("");
  }, [showWorkspaceSwitcher]);

  // Keep shortcut store in sync when local state changes
  const setShowDropdown = (show: boolean) => {
    setShowDropdownLocal(show);
    setShowWorkspaceSwitcher(show);
  };
  const [version, setVersion] = useState("0.1.0");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const {
    data: discovery,
    isLoading: isDiscovering,
    refetch: rescan,
    isRefetching,
  } = useQuery({
    queryKey: ["discover-workspaces"],
    queryFn: () => discoverWorkspaces(4),
    staleTime: 5 * 60 * 1000,
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    },
    []
  );

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

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

  const handleClearWorkspace = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(null);
  };

  const filteredWorkspaces =
    discovery?.workspaces
      .filter(isRealWorkspace)
      .filter(
        (ws) =>
          !filter ||
          ws.name.toLowerCase().includes(filter.toLowerCase()) ||
          ws.path.toLowerCase().includes(filter.toLowerCase())
      ) ?? [];

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{ width: sidebarWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0">
          <circle cx="32" cy="32" r="24" fill="none" stroke="#3B82F6" strokeWidth="5"/>
          <line x1="32" y1="8" x2="32" y2="56" stroke="#3B82F6" strokeWidth="3"/>
          <line x1="11" y1="20" x2="53" y2="44" stroke="#3B82F6" strokeWidth="3"/>
          <line x1="53" y1="20" x2="11" y2="44" stroke="#3B82F6" strokeWidth="3"/>
          <path d="M32,8 A24,24 0 0,1 52.8,20 L32,32 Z" fill="#3B82F6"/>
        </svg>
        <h1 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Loadout
        </h1>
      </div>

      {/* Workspace selector */}
      <div className="relative border-b border-sidebar-border p-2" ref={dropdownRef}>
        <button
          onClick={() => {
            setShowDropdown(!showDropdown);
            setFilter("");
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            "hover:bg-sidebar-accent/50",
            current
              ? "text-sidebar-foreground"
              : "text-muted-foreground"
          )}
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">
            {current ? current.name : "Select workspace"}
          </span>
          {current ? (
            <X
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleClearWorkspace}
            />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-md border border-border bg-card shadow-lg">
            {/* Search filter */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter workspaces..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            {/* Workspace list */}
            <div className="max-h-64 overflow-auto py-1">
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
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                        isActive && "bg-accent"
                      )}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-xs">
                            {ws.name}
                          </span>
                          {ws.isGitRepo && (
                            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                          <ToolDots workspace={ws} />
                        </div>
                        <p
                          className="truncate text-[10px] text-muted-foreground"
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

            {/* Footer: browse + rescan */}
            <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
              <button
                onClick={handleSelectFolder}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <FolderOpen className="h-3 w-3" />
                Browse...
              </button>
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

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="my-2 border-t border-sidebar-border" />

        <button
          onClick={() => setActiveTab("learn")}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
            activeTab === "learn"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Learn
        </button>
      </nav>

      {/* Footer: settings + version */}
      <div className="border-t border-sidebar-border px-3 py-2">
        <SettingsMenu version={version} />
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500/40",
          isResizing && "bg-blue-500/40"
        )}
      />
    </aside>
  );
}
