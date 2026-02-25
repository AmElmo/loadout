import { useState, useEffect, useCallback } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ArrowUpCircle, ExternalLink, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DownloadStatus = "idle" | "downloading" | "installing";

export function UpdateNotification() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for updates after a short delay so it doesn't block startup
    const timer = setTimeout(async () => {
      try {
        const result = await check();
        if (result?.available) {
          setUpdate(result);
        }
      } catch {
        // Silently fail — update checks should never break the app
      }
    }, 3000);

    // Check periodically (every 4 hours)
    const interval = setInterval(async () => {
      try {
        const result = await check();
        if (result?.available) {
          setUpdate(result);
          setDismissed(false);
        }
      } catch {
        // Silently fail
      }
    }, 4 * 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!update) return;

    setError(null);
    setStatus("downloading");
    setProgress(0);

    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            setProgress(Math.round((downloadedBytes / totalBytes) * 100));
          }
        } else if (event.event === "Finished") {
          setStatus("installing");
        }
      });

      await relaunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      setStatus("idle");
    }
  }, [update]);

  if (!update || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowUpCircle className="h-4 w-4 text-primary" />
          Update available: v{update.version}
        </div>
        {status === "idle" && (
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Release notes */}
      {update.body && (
        <div className="max-h-32 overflow-auto px-4 py-2 text-xs text-muted-foreground">
          {update.body.split("\n").map((line, i) => (
            <p key={i} className={cn(line.trim() === "" && "h-2")}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {status !== "idle" && (
        <div className="px-4 py-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${status === "installing" ? 100 : progress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {status === "downloading" && `Downloading... ${progress}%`}
            {status === "installing" && "Installing..."}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <button
          onClick={handleUpdate}
          disabled={status !== "idle"}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {status !== "idle" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Update Now"
          )}
        </button>
        <a
          href="https://github.com/AmElmo/loadout/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Release Notes
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
