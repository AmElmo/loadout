import { invoke } from "@tauri-apps/api/core";

export interface DetectedTool {
  tool: string;
  hasConfig: boolean;
  hasCli: boolean;
}

export interface DetectionResult {
  tools: DetectedTool[];
}

/**
 * Detect which AI coding tools are installed on this machine.
 * Checks for config directories and CLI binaries.
 */
export async function detectInstalledTools(): Promise<DetectionResult> {
  return invoke<DetectionResult>("detect_installed_tools");
}
