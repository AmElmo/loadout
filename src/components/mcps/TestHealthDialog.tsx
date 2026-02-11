import { useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MCPItem, HealthTestResult } from "@/types";
import { testMCPHealth } from "@/lib/api/mcps";
import { Button } from "@/components/ui/button";

interface TestHealthDialogProps {
  mcp: MCPItem;
  onClose: () => void;
}

export function TestHealthDialog({ mcp, onClose }: TestHealthDialogProps) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<HealthTestResult | null>(null);

  const isHttp = mcp.mcpType === "http";
  const commandDisplay = isHttp
    ? `GET ${mcp.url}`
    : `${mcp.command ?? ""} ${mcp.args.join(" ")}`.trim();

  const testMutation = useMutation({
    mutationFn: () => testMCPHealth(mcp),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Test MCP Health</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          {!result && !testMutation.isPending && (
            <>
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  {isHttp
                    ? "This will send an HTTP request to the MCP server URL."
                    : "This will execute the following command on your system:"}
                </p>
              </div>

              <div className="rounded-md bg-muted px-3 py-2">
                <code className="break-all text-sm">{commandDisplay}</code>
              </div>
            </>
          )}

          {testMutation.isPending && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Testing {mcp.name}...
              </p>
            </div>
          )}

          {testMutation.isError && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600">
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : String(testMutation.error)}
            </div>
          )}

          {result && (
            <div className="flex flex-col items-center gap-3 py-2">
              {result.status === "healthy" ? (
                <CheckCircle className="h-10 w-10 text-success" />
              ) : (
                <XCircle className="h-10 w-10 text-error" />
              )}
              <p className="text-center text-sm font-medium">
                {result.status === "healthy" ? "Healthy" : "Failed"}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          )}
          {result && result.status !== "healthy" && (
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                testMutation.reset();
              }}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
