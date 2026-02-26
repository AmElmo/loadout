import { AlertTriangle, Check, Link2, Loader2 } from "lucide-react";
import type { ExistingToolInfo, InstallMethod, SourceTool } from "@/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "@/components/ToolLogo";
import { ALL_TOOLS, TOOL_CONFIG } from "@/config/tools";

interface ConversionState {
  isPending: boolean;
  isSuccess: boolean;
  isPartial: boolean;
  canonicalPath: string | null;
  error: Error | null;
  onConvert: () => void;
}

interface ToolSelectorProps {
  selectedTools: SourceTool[];
  onToolsChange: (tools: SourceTool[]) => void;
  type?: "mcp" | "skill";
  existingTools?: SourceTool[];
  disabledTools?: SourceTool[];
  disabledReason?: string;
  /** If provided, only these tools will be shown. Otherwise all tools are shown. */
  availableTools?: SourceTool[];
  /** Install method (link or copy). When "link", Codex gets a special hint. */
  installMethod?: InstallMethod;
  /** Install methods for each existing tool (enables method tags + conversion UI) */
  existingToolMethods?: ExistingToolInfo[];
  /** Conversion state for converting copies to links */
  conversionState?: ConversionState;
  /** Whether variants have content drift */
  hasContentDrift?: boolean;
}

const allToolItems = ALL_TOOLS.map((id) => ({
  id,
  label: TOOL_CONFIG[id].label,
  color: `accent-${TOOL_CONFIG[id].color}-500`,
}));

export function ToolSelector({
  selectedTools,
  onToolsChange,
  type = "mcp",
  existingTools = [],
  disabledTools = [],
  disabledReason,
  availableTools,
  installMethod,
  existingToolMethods,
  conversionState,
  hasContentDrift,
}: ToolSelectorProps) {
  const tools = availableTools
    ? allToolItems.filter(({ id }) => availableTools.includes(id))
    : allToolItems;

  const toggle = (tool: SourceTool) => {
    if (disabledTools.includes(tool)) {
      return;
    }

    if (selectedTools.includes(tool)) {
      onToolsChange(selectedTools.filter((t) => t !== tool));
    } else {
      onToolsChange([...selectedTools, tool]);
    }
  };

  const installedTools = tools.filter(({ id }) => existingTools.includes(id));
  const targetTools = tools.filter(
    ({ id }) => !existingTools.includes(id)
  );

  // In link mode, Codex reads from ~/.agents/skills/ natively
  const isCodexCoveredByLink =
    type === "skill" && installMethod === "link";

  // Build a lookup for existing tool methods
  const methodByTool = new Map(
    (existingToolMethods ?? []).map((t) => [t.tool, t.method])
  );
  const copyCount = (existingToolMethods ?? []).filter(
    (t) => t.method === "copy"
  ).length;

  // Conversion banner visibility:
  // type === "skill", existingToolMethods provided, onConvert provided,
  // selected method is "link", at least one copy, not fully succeeded
  const showConversionBanner =
    type === "skill" &&
    !!existingToolMethods &&
    !!conversionState &&
    installMethod === "link" &&
    copyCount > 0 &&
    (!conversionState.isSuccess || conversionState.isPartial);

  return (
    <div className="space-y-4">
      {/* Already installed section */}
      {installedTools.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Already installed in
          </label>
          <div className="flex flex-wrap gap-3">
            {installedTools.map(({ id, label }) => {
              const toolMethod = methodByTool.get(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-green-500" />
                  <ToolLogo tool={id} size={14} />
                  {label}
                  {toolMethod && (
                    <span
                      className={cn(
                        "rounded px-1 py-0.5 text-[10px] font-medium",
                        toolMethod === "link"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {toolMethod}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Conversion banner */}
          {showConversionBanner && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              {conversionState.error ? (
                <p className="text-xs text-red-600">
                  Failed to convert:{" "}
                  {conversionState.error instanceof Error
                    ? conversionState.error.message
                    : String(conversionState.error)}
                </p>
              ) : conversionState.isPartial ? (
                <div className="flex items-center gap-2 text-xs text-yellow-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Some tools fell back to copy
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {copyCount} tool{copyCount !== 1 ? "s" : ""} use
                      independent copies
                    </p>
                    {hasContentDrift && (
                      <p className="text-[10px] text-yellow-600">
                        All copies will be unified to the currently selected
                        version
                      </p>
                    )}
                  </div>
                  <button
                    onClick={conversionState.onConvert}
                    disabled={conversionState.isPending}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {conversionState.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Link2 className="h-3 w-3" />
                    )}
                    Link All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Conversion success */}
          {conversionState?.isSuccess && !conversionState.isPartial && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-700">
              <Check className="h-3.5 w-3.5 shrink-0" />
              All linked
              {conversionState.canonicalPath && (
                <span className="truncate font-mono text-muted-foreground">
                  from {conversionState.canonicalPath}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Codex covered hint in link mode */}
      {isCodexCoveredByLink && (
        <div className="flex items-center gap-2 rounded-md bg-blue-500/10 px-3 py-2 text-xs text-blue-700">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <ToolLogo tool="codex" size={12} />
          Codex already reads from{" "}
          <code className="rounded bg-blue-500/20 px-1">
            ~/.agents/skills/
          </code>{" "}
          — no extra install needed
        </div>
      )}

      {/* Sync targets section */}
      {targetTools.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Sync to</label>
          <div className="flex flex-wrap gap-3">
            {targetTools.map(({ id, label, color }) => {
              const isDisabled = disabledTools.includes(id);
              return (
                <label
                  key={id}
                  title={isDisabled ? disabledReason : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    isDisabled
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer",
                    selectedTools.includes(id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(id)}
                    onChange={() => toggle(id)}
                    disabled={isDisabled}
                    className={cn("h-4 w-4 rounded", color)}
                  />
                  <ToolLogo tool={id} size={14} />
                  {label}
                  {isDisabled && disabledReason && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({disabledReason})
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          {type === "skill" && selectedTools.includes("gemini") && (
            <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Skills are experimental in Gemini CLI (requires{" "}
              <code className="rounded bg-yellow-500/20 px-1">
                experiments.agentSkills: true
              </code>
              )
            </div>
          )}
        </div>
      )}
    </div>
  );
}
