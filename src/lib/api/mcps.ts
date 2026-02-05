import { invoke } from "@tauri-apps/api/core";
import type { MCPItem } from "@/types";

/**
 * Scan all MCP configurations from Claude Code, Codex CLI, and Gemini CLI
 */
export async function scanMCPs(
  workspacePath?: string
): Promise<MCPItem[]> {
  return invoke<MCPItem[]>("scan_mcps", { workspacePath });
}
