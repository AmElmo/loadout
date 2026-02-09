import { useState } from "react";
import type { PreviewConfig, SourceTool } from "@/types";
import { cn } from "@/lib/utils";

interface ConfigPreviewProps {
  previews: PreviewConfig[];
}

const toolLabels: Record<SourceTool, string> = {
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
};

export function ConfigPreview({ previews }: ConfigPreviewProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (previews.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Config Preview</label>
      <div className="overflow-hidden rounded-md border border-border">
        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          {previews.map((preview, i) => (
            <button
              key={preview.tool}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === i
                  ? "border-b-2 border-primary bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {toolLabels[preview.tool]}{" "}
              <span className="text-muted-foreground">
                ({preview.format.toUpperCase()})
              </span>
            </button>
          ))}
        </div>
        {/* Content */}
        <pre className="max-h-48 overflow-auto p-3 font-mono text-xs">
          {previews[activeTab]?.content}
        </pre>
      </div>
    </div>
  );
}
