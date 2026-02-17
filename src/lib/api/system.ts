import { invoke } from "@tauri-apps/api/core";

/**
 * Reveal a file or folder in the system file manager.
 * - macOS: Finder
 * - Windows: Explorer
 * - Linux: default file manager
 */
export async function revealInFileManager(path: string): Promise<void> {
  return invoke("reveal_in_file_manager", { path });
}
