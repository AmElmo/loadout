import { Link2, Copy } from "lucide-react";
import type { InstallMethod } from "@/types";
import { cn } from "@/lib/utils";

interface InstallMethodSelectorProps {
  method: InstallMethod;
  onChange: (method: InstallMethod) => void;
}

export function InstallMethodSelector({
  method,
  onChange,
}: InstallMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Install Method</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("link")}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
            method === "link"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Link</div>
            <div className="text-xs text-muted-foreground">
              Single source, shared across tools
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange("copy")}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
            method === "copy"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <Copy className="h-4 w-4 shrink-0" />
          <div className="text-left">
            <div className="font-medium">Copy</div>
            <div className="text-xs text-muted-foreground">
              Independent copy per tool
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
