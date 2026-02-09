import { CheckCircle, FolderOpen } from "lucide-react";
import type { WriteResult } from "@/types";
import { Button } from "@/components/ui/button";

interface SuccessConfirmationProps {
  result: WriteResult;
  type: "mcp" | "skill";
  onClose: () => void;
}

function normalizePath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, "~");
}

export function SuccessConfirmation({
  result,
  type,
  onClose,
}: SuccessConfirmationProps) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <div>
        <h3 className="text-lg font-semibold">
          {type === "mcp" ? "MCP Added" : "Skill Installed"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.modifiedFiles.length} file
          {result.modifiedFiles.length !== 1 ? "s" : ""} modified
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-1">
        {result.modifiedFiles.map((file) => (
          <div
            key={file}
            className="flex items-center gap-2 rounded-md bg-green-500/5 px-3 py-1.5 text-left text-xs"
          >
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-green-600" />
            <span className="truncate font-mono" title={file}>
              {normalizePath(file)}
            </span>
          </div>
        ))}
      </div>

      {result.errors.length > 0 && (
        <div className="mx-auto max-w-sm space-y-1">
          <p className="text-xs font-medium text-red-600">
            Some tools failed:
          </p>
          {result.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">
              {err}
            </p>
          ))}
        </div>
      )}

      <Button onClick={onClose}>Done</Button>
    </div>
  );
}
