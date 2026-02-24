import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Code, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const [mode, setMode] = useState<"preview" | "source">("preview");

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Mode toggle */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-4 py-1.5">
        <button
          onClick={() => setMode("preview")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
            mode === "preview"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          onClick={() => setMode("source")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
            mode === "source"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Code className="h-3.5 w-3.5" />
          Source
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === "source" ? (
          <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-sm">
            {content}
          </pre>
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
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
