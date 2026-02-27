import { useEffect } from "react";

const isMac = navigator.platform.toUpperCase().includes("MAC");

/**
 * Calls `handler` on Cmd+Enter (Mac) or Ctrl+Enter (Windows).
 * Only fires when `enabled` is true (use for form validation).
 */
export function useSubmitShortcut(handler: () => void, enabled = true) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!enabled) return;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        handler();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handler, enabled]);
}
