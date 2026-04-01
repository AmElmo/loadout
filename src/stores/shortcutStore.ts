import { create } from "zustand";

type ShortcutAction = "focus-search" | "add-item" | "refresh";

interface ShortcutState {
  /** Incremented to trigger page-level actions (acts as event bus) */
  actionCounter: Record<ShortcutAction, number>;
  /** Whether the keyboard shortcuts modal is open */
  showShortcutsModal: boolean;

  dispatch: (action: ShortcutAction) => void;
  setShowShortcutsModal: (show: boolean) => void;
}

export type { ShortcutAction };

export const useShortcutStore = create<ShortcutState>()((set) => ({
  actionCounter: {
    "focus-search": 0,
    "add-item": 0,
    refresh: 0,
  },
  showShortcutsModal: false,

  dispatch: (action) =>
    set((state) => ({
      actionCounter: {
        ...state.actionCounter,
        [action]: state.actionCounter[action] + 1,
      },
    })),
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
}));
