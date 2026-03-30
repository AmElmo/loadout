import { invoke } from "@tauri-apps/api/core";
import type { PluginScanResult } from "@/types";

/**
 * Scan installed plugins and marketplace catalogs across
 * Claude Code CLI, Claude Desktop Cowork, and Gemini CLI.
 */
export async function scanPlugins(
  workspacePath?: string
): Promise<PluginScanResult> {
  return invoke<PluginScanResult>("scan_plugins", { workspacePath });
}
