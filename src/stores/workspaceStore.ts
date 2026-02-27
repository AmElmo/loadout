import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkspaceInfo } from "@/lib/api/workspace";

interface WorkspaceState {
  current: WorkspaceInfo | null;
  recent: string[];
  activeTab: "home" | "mcps" | "skills" | "agents" | "rules" | "hooks" | "plugins" | "context" | "learn";
  sidebarWidth: number;
  setCurrent: (workspace: WorkspaceInfo | null) => void;
  addRecent: (path: string) => void;
  setActiveTab: (tab: "home" | "mcps" | "skills" | "agents" | "rules" | "hooks" | "plugins" | "context" | "learn") => void;
  setSidebarWidth: (width: number) => void;
}

const MAX_RECENT = 5;

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      current: null,
      recent: [],
      activeTab: "home",
      sidebarWidth: 200,
      setCurrent: (workspace) =>
        set((state) => {
          if (workspace) {
            const newRecent = [
              workspace.path,
              ...state.recent.filter((p) => p !== workspace.path),
            ].slice(0, MAX_RECENT);
            return { current: workspace, recent: newRecent };
          }
          return { current: null };
        }),
      addRecent: (path) =>
        set((state) => ({
          recent: [path, ...state.recent.filter((p) => p !== path)].slice(
            0,
            MAX_RECENT
          ),
        })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
    }),
    {
      name: "loadout-workspace",
      partialize: (state) => ({
        recent: state.recent,
        activeTab: state.activeTab,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);
