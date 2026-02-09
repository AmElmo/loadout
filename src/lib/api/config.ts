import { invoke } from "@tauri-apps/api/core";
import type { PromptScanResult, HookScanResult } from "@/types";

/**
 * Scan system prompt / rule files (CLAUDE.md, AGENTS.md, GEMINI.md)
 */
export async function scanRules(
  workspacePath?: string
): Promise<PromptScanResult> {
  return invoke<PromptScanResult>("scan_rules", { workspacePath });
}

/**
 * Scan hook configurations from Claude and Gemini settings
 */
export async function scanHooks(): Promise<HookScanResult> {
  return invoke<HookScanResult>("scan_hooks");
}
