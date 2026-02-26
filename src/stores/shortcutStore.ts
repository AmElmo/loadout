import { create } from "zustand";

type ShortcutAction =
  | "focus-search"
  | "add-item"
  | "refresh"
  | "sync-item"
  | "open-config"
  | "test-mcp";

interface ShortcutState {
  /** Incremented to trigger page-level actions (acts as event bus) */
  actionCounter: Record<ShortcutAction, number>;
  /** Whether the keyboard shortcuts modal is open */
  showShortcutsModal: boolean;
  /** Whether the workspace switcher is open */
  showWorkspaceSwitcher: boolean;

  dispatch: (action: ShortcutAction) => void;
  setShowShortcutsModal: (show: boolean) => void;
  toggleWorkspaceSwitcher: () => void;
  setShowWorkspaceSwitcher: (show: boolean) => void;
}

export type { ShortcutAction };

export const useShortcutStore = create<ShortcutState>()((set) => ({
  actionCounter: {
    "focus-search": 0,
    "add-item": 0,
    refresh: 0,
    "sync-item": 0,
    "open-config": 0,
    "test-mcp": 0,
  },
  showShortcutsModal: false,
  showWorkspaceSwitcher: false,

  dispatch: (action) =>
    set((state) => ({
      actionCounter: {
        ...state.actionCounter,
        [action]: state.actionCounter[action] + 1,
      },
    })),
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  toggleWorkspaceSwitcher: () =>
    set((state) => ({ showWorkspaceSwitcher: !state.showWorkspaceSwitcher })),
  setShowWorkspaceSwitcher: (show) => set({ showWorkspaceSwitcher: show }),
}));
