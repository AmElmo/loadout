import { CheckCircle, FolderOpen, Link2, AlertTriangle } from "lucide-react";
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
  const isLinkMode = result.method === "link";

  return (
    <div className="space-y-4 text-center">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <div>
        <h3 className="text-lg font-semibold">
          {type === "mcp" ? "MCP Added" : "Skill Installed"}
        </h3>
        {isLinkMode && result.canonicalPath && (
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            Linked from{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {normalizePath(result.canonicalPath)}
            </code>
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {result.modifiedFiles.length} path
          {result.modifiedFiles.length !== 1 ? "s" : ""} modified
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-1">
        {result.modifiedFiles.map((file) => {
          const isSymlink = file.includes(" -> ");
          return (
            <div
              key={file}
              className="flex items-center gap-2 rounded-md bg-green-500/5 px-3 py-1.5 text-left text-xs"
            >
              {isSymlink ? (
                <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-green-600" />
              )}
              <span className="truncate font-mono" title={file}>
                {normalizePath(file)}
              </span>
            </div>
          );
        })}
      </div>

      {result.symlinkFailed && (
        <div className="mx-auto flex max-w-sm items-start gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-left text-xs text-yellow-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Some tools could not be linked and received copies instead. Edits to
            those copies will not stay in sync automatically.
          </span>
        </div>
      )}

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
