import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useShortcutStore, type ShortcutAction } from "@/stores/shortcutStore";

const isMac = navigator.platform.toUpperCase().includes("MAC");

const TAB_IDS = [
  "home",
  "mcps",
  "skills",
  "rules",
  "agents",
  "hooks",
  "plugins",
  "context",
] as const;

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Global keyboard shortcut listener.
 * Mount once in App.tsx — handles navigation, workspace switcher, modal toggles,
 * and dispatches page-level actions via the shortcut store.
 */
export function useKeyboardShortcuts() {
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const dispatch = useShortcutStore((s) => s.dispatch);
  const setShowShortcutsModal = useShortcutStore(
    (s) => s.setShowShortcutsModal
  );
  const showShortcutsModal = useShortcutStore((s) => s.showShortcutsModal);
  const toggleWorkspaceSwitcher = useShortcutStore(
    (s) => s.toggleWorkspaceSwitcher
  );
  const showWorkspaceSwitcher = useShortcutStore(
    (s) => s.showWorkspaceSwitcher
  );
  const setShowWorkspaceSwitcher = useShortcutStore(
    (s) => s.setShowWorkspaceSwitcher
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Esc: close shortcuts modal, then workspace switcher (priority order)
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          e.preventDefault();
          setShowShortcutsModal(false);
          return;
        }
        if (showWorkspaceSwitcher) {
          e.preventDefault();
          setShowWorkspaceSwitcher(false);
          return;
        }
        // Esc for dialogs is handled by useEscapeKey in each dialog
        return;
      }

      // Cmd+/ — toggle shortcuts modal
      if (mod && e.key === "/") {
        e.preventDefault();
        setShowShortcutsModal(!showShortcutsModal);
        return;
      }

      // Don't process further shortcuts while shortcuts modal is open
      if (showShortcutsModal) return;

      // Cmd+K — toggle workspace switcher
      if (mod && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        toggleWorkspaceSwitcher();
        return;
      }

      // Cmd+1 through Cmd+8 — tab navigation
      if (mod && !e.shiftKey) {
        const digit = parseInt(e.key, 10);
        if (digit >= 1 && digit <= TAB_IDS.length) {
          e.preventDefault();
          setActiveTab(TAB_IDS[digit - 1]);
          setShowWorkspaceSwitcher(false);
          return;
        }
      }

      // Skip remaining shortcuts when typing in inputs
      if (isInputFocused()) return;

      // Cmd+F — focus search
      if (mod && !e.shiftKey && e.key === "f") {
        e.preventDefault();
        dispatch("focus-search");
        return;
      }

      // Cmd+N — add new item
      if (mod && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        dispatch("add-item");
        return;
      }

      // Cmd+R — refresh
      if (mod && !e.shiftKey && e.key === "r") {
        e.preventDefault();
        dispatch("refresh");
        return;
      }

      // Item actions (Cmd+Shift+S/O/T) are reserved but not yet wired —
      // they require per-item focus tracking which is not yet implemented.
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showShortcutsModal,
    showWorkspaceSwitcher,
    setActiveTab,
    dispatch,
    setShowShortcutsModal,
    toggleWorkspaceSwitcher,
    setShowWorkspaceSwitcher,
  ]);
}

/**
 * Hook to subscribe to a dispatched shortcut action.
 * Calls `handler` whenever the specified action is dispatched.
 */
export function useShortcutAction(
  action: ShortcutAction,
  handler: () => void
) {
  const counter = useShortcutStore((s) => s.actionCounter[action]);
  const lastSeen = useRef(counter);

  useEffect(() => {
    if (counter > lastSeen.current) {
      handler();
    }
    lastSeen.current = counter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter]);
}

// Re-export for convenience
export { isMac };
