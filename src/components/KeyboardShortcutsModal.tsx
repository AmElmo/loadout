import { X } from "lucide-react";
import { useCallback } from "react";
import { useShortcutStore } from "@/stores/shortcutStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { isMac } from "@/hooks/useKeyboardShortcuts";
import { DialogOverlay } from "@/components/ui/dialog-overlay";

const mod = isMac ? "\u2318" : "Ctrl";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; action: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: `${mod}+1`, action: "Go to Home" },
      { keys: `${mod}+2`, action: "Go to MCPs" },
      { keys: `${mod}+3`, action: "Go to Skills" },
      { keys: `${mod}+4`, action: "Go to Rules" },
      { keys: `${mod}+5`, action: "Go to Subagents" },
      { keys: `${mod}+6`, action: "Go to Hooks" },
      { keys: `${mod}+7`, action: "Go to Context" },
      { keys: `${mod}+8`, action: "Go to Learn" },
    ],
  },
  {
    title: "Workspace",
    shortcuts: [
      { keys: `${mod}+K`, action: "Open workspace switcher" },
      { keys: "Esc", action: "Close workspace switcher" },
    ],
  },
  {
    title: "Search & Filter",
    shortcuts: [
      { keys: `${mod}+F`, action: "Focus search bar" },
      { keys: "Esc", action: "Clear search / close dialog" },
    ],
  },
  {
    title: "Page Actions",
    shortcuts: [
      { keys: `${mod}+N`, action: "Add new item" },
      { keys: `${mod}+R`, action: "Refresh current list" },
    ],
  },
  {
    title: "Dialog Actions",
    shortcuts: [
      { keys: `${mod}+Enter`, action: "Submit / Confirm" },
      { keys: "Esc", action: "Cancel / Close dialog" },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ keys: `${mod}+/`, action: "Open this panel" }],
  },
];

function Kbd({ children }: { children: string }) {
  const parts = children.split("+");
  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-0.5 text-muted-foreground/50">+</span>}
          <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground shadow-sm">
            {part}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function KeyboardShortcutsModal() {
  const setShowShortcutsModal = useShortcutStore(
    (s) => s.setShowShortcutsModal
  );
  const close = useCallback(() => setShowShortcutsModal(false), [setShowShortcutsModal]);
  useEscapeKey(close);

  return (
    <DialogOverlay onClose={close} className="p-0">
      <div className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={close}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span className="text-foreground">{shortcut.action}</span>
                    <Kbd>{shortcut.keys}</Kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Press <Kbd>Esc</Kbd> to close
          </p>
        </div>
      </div>
    </DialogOverlay>
  );
}
