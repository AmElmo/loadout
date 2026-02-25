import { invoke } from "@tauri-apps/api/core";
import type {
  AgentScanResult,
  InstallAgentRequest,
  SyncAgentRequest,
  AgentWriteResult,
} from "@/types";

/**
 * Scan all agents from Claude Code and Gemini CLI
 */
export async function scanAgents(
  workspacePath?: string
): Promise<AgentScanResult> {
  return invoke<AgentScanResult>("scan_agents", { workspacePath });
}

/**
 * Install a new agent to one or more tools
 */
export async function installAgentToTools(
  request: InstallAgentRequest
): Promise<AgentWriteResult> {
  return invoke<AgentWriteResult>("install_agent_to_tools", { request });
}

/**
 * Sync an existing agent to other tools
 */
export async function syncAgentToTools(
  request: SyncAgentRequest
): Promise<AgentWriteResult> {
  return invoke<AgentWriteResult>("sync_agent_to_tools", { request });
}
