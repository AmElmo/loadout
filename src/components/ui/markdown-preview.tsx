import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  onSave?: (content: string) => Promise<void>;
  onClose?: () => void;
  onModeChange?: (mode: "edit" | "preview") => void;
  /** Rendered below the Edit/Preview toggle bar when in edit mode */
  editToolbar?: React.ReactNode;
}

export function MarkdownPreview({ content, className, onSave, onClose, onModeChange, editToolbar }: MarkdownPreviewProps) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDirty = draft !== content;

  // Sync draft when content changes externally (e.g. switching variants)
  useEffect(() => {
    setDraft(content);
  }, [content]);

  // Clear saved indicator when user starts editing again
  useEffect(() => {
    if (isDirty) setSaved(false);
  }, [isDirty]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Focus textarea when switching to edit mode
  useEffect(() => {
    if (mode === "edit" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  const handleSave = useCallback(async () => {
    if (!onSave || !isDirty) return;
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [onSave, isDirty, draft]);

  const handleSaveAndClose = useCallback(async () => {
    if (!onSave || !isDirty) {
      onClose?.();
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }, [onSave, onClose, isDirty, draft]);

  // Keyboard shortcuts: Cmd/Ctrl+S to save, Cmd/Ctrl+Enter to save & close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || mode !== "edit") return;

      if (e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSaveAndClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handleSave, handleSaveAndClose]);

  const handleDiscard = () => {
    setDraft(content);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Toggle bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-1.5">
        {/* Pill toggle */}
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            onClick={() => { setMode("edit"); onModeChange?.("edit"); }}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "edit"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Edit
          </button>
          <button
            onClick={() => { setMode("preview"); onModeChange?.("preview"); }}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Preview
          </button>
        </div>

        {/* Save / discard actions */}
        {mode === "edit" && onSave && (isDirty || saved) && (
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                Saved
              </span>
            ) : (
              <>
                <button
                  onClick={handleDiscard}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Optional toolbar below toggle when editing */}
      {mode === "edit" && editToolbar}

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === "edit" ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
            spellCheck={false}
          />
        ) : (
          <div className="markdown-body p-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {isDirty ? draft : content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
