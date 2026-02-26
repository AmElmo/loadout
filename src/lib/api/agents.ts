import { invoke } from "@tauri-apps/api/core";
import type {
  AgentScanResult,
  InstallAgentRequest,
  SyncAgentRequest,
  AgentWriteResult,
  FetchedAgent,
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

/**
 * Fetch an agent from a URL and parse its frontmatter
 */
export async function fetchAgentFromUrl(
  url: string
): Promise<FetchedAgent> {
  return invoke<FetchedAgent>("fetch_agent_from_url", { url });
}

/**
 * Read and parse an agent file from disk (for file picker)
 */
export async function readAgentFile(
  path: string
): Promise<FetchedAgent> {
  return invoke<FetchedAgent>("read_agent_file", { path });
}

/**
 * Parse raw agent file content (for drag-and-drop)
 */
export async function parseAgentFileContent(
  content: string,
  filename: string
): Promise<FetchedAgent> {
  return invoke<FetchedAgent>("parse_agent_file_content", { content, filename });
}
