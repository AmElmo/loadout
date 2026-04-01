import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DiscoveredWorkspace } from "@/types";

type ActiveTab = "home" | "mcps" | "skills" | "agents" | "rules" | "hooks" | "plugins" | "context" | "repos" | "learn";

interface WorkspaceState {
  activeTab: ActiveTab;
  sidebarWidth: number;
  /** Currently selected repo in the Repos detail view */
  selectedRepo: DiscoveredWorkspace | null;
  setActiveTab: (tab: ActiveTab) => void;
  setSidebarWidth: (width: number) => void;
  setSelectedRepo: (repo: DiscoveredWorkspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTab: "home",
      sidebarWidth: 200,
      selectedRepo: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSelectedRepo: (repo) => set({ selectedRepo: repo }),
    }),
    {
      name: "loadout-workspace",
      partialize: (state) => ({
        activeTab: state.activeTab,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);
