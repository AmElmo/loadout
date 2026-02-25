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

/**
 * Save text content to a file using atomic write.
 */
export async function saveFileContent(path: string, content: string): Promise<void> {
  return invoke("save_file_content", { path, content });
}

/**
 * Save skill body content while preserving YAML frontmatter.
 */
export async function saveSkillContent(path: string, body: string): Promise<void> {
  return invoke("save_skill_content", { path, body });
}
