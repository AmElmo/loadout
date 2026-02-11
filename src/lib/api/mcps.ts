import { invoke } from "@tauri-apps/api/core";
import type { MCPItem, HealthTestResult } from "@/types";

/**
 * Scan all MCP configurations from Claude Code, Codex CLI, and Gemini CLI
 */
export async function scanMCPs(
  workspacePath?: string
): Promise<MCPItem[]> {
  return invoke<MCPItem[]>("scan_mcps", { workspacePath });
}

/**
 * Test an MCP server's health by attempting a protocol handshake.
 * For stdio MCPs: spawns the process and sends a JSON-RPC initialize request.
 * For HTTP MCPs: sends an HTTP GET to check reachability.
 */
export async function testMCPHealth(mcp: MCPItem): Promise<HealthTestResult> {
  return invoke<HealthTestResult>("test_mcp_health", {
    name: mcp.name,
    mcpType: mcp.mcpType,
    command: mcp.command,
    args: mcp.args,
    url: mcp.url,
    configPath: mcp.path,
  });
}
