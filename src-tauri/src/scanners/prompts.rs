//! System prompt and rules scanner for Claude Code, Codex CLI, and Gemini CLI
//!
//! Scans main prompt files (CLAUDE.md, AGENTS.md, GEMINI.md) and rules directories
//! at both global and project levels.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Source tool for a prompt
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PromptSourceTool {
    Claude,
    Codex,
    Gemini,
}

/// Scope of a prompt file
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PromptScope {
    Global,
    Project,
}

/// A discovered system prompt or rule file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptFile {
    /// Display name (e.g. "CLAUDE.md", "frontend/react.md")
    pub name: String,
    /// Which tool this prompt belongs to
    pub source_tool: PromptSourceTool,
    /// Global or project scope
    pub scope: PromptScope,
    /// Absolute path to the file
    pub path: String,
    /// Whether the file exists on disk
    pub exists: bool,
    /// File content (empty string if file doesn't exist)
    pub content: String,
    /// File size in bytes
    pub size: u64,
}

/// Result of scanning all system prompts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptScanResult {
    pub prompts: Vec<PromptFile>,
}

/// Scan all system prompt files and rules directories
pub fn scan_all_prompts(workspace_path: Option<&str>) -> Result<PromptScanResult, String> {
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
    let mut prompts: Vec<PromptFile> = Vec::new();

    // === Global main prompts ===
    let global_paths = vec![
        (PromptSourceTool::Claude, home_dir.join(".claude").join("CLAUDE.md")),
        (PromptSourceTool::Codex, home_dir.join(".codex").join("AGENTS.md")),
        (PromptSourceTool::Gemini, home_dir.join(".gemini").join("GEMINI.md")),
    ];

    for (tool, path) in global_paths {
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        prompts.push(scan_prompt_file(&name, tool, PromptScope::Global, &path));
    }

    // === Global rules directories ===
    // Claude: ~/.claude/rules/*.md (recursive)
    scan_rules_directory(
        &mut prompts,
        PromptSourceTool::Claude,
        PromptScope::Global,
        &home_dir.join(".claude").join("rules"),
    );

    // === Project prompts (if workspace is selected) ===
    if let Some(ws_path) = workspace_path {
        let project_root = PathBuf::from(ws_path);

        // Main prompt files: check root-level and config-dir for each tool
        // Claude: CLAUDE.md at root and .claude/CLAUDE.md
        scan_project_prompt(
            &mut prompts,
            PromptSourceTool::Claude,
            &project_root,
            "CLAUDE.md",
            ".claude",
        );

        // Claude: CLAUDE.local.md (personal overrides, not committed)
        let claude_local = project_root.join("CLAUDE.local.md");
        if claude_local.exists() {
            prompts.push(scan_prompt_file(
                "CLAUDE.local.md",
                PromptSourceTool::Claude,
                PromptScope::Project,
                &claude_local,
            ));
        }

        // Codex: AGENTS.md at root and .codex/AGENTS.md
        scan_project_prompt(
            &mut prompts,
            PromptSourceTool::Codex,
            &project_root,
            "AGENTS.md",
            ".codex",
        );

        // Codex: AGENTS.override.md (takes priority over AGENTS.md)
        let codex_override = project_root.join("AGENTS.override.md");
        if codex_override.exists() {
            prompts.push(scan_prompt_file(
                "AGENTS.override.md",
                PromptSourceTool::Codex,
                PromptScope::Project,
                &codex_override,
            ));
        }

        // Gemini: GEMINI.md at root and .gemini/GEMINI.md
        scan_project_prompt(
            &mut prompts,
            PromptSourceTool::Gemini,
            &project_root,
            "GEMINI.md",
            ".gemini",
        );

        // Project rules directories
        // Claude: .claude/rules/*.md (recursive)
        scan_rules_directory(
            &mut prompts,
            PromptSourceTool::Claude,
            PromptScope::Project,
            &project_root.join(".claude").join("rules"),
        );

        // Gemini: .gemini/rules/*.md (recursive, if it exists)
        scan_rules_directory(
            &mut prompts,
            PromptSourceTool::Gemini,
            PromptScope::Project,
            &project_root.join(".gemini").join("rules"),
        );

        // Subdirectory context files (Codex and Gemini place their main files in subdirs)
        // Walk the project tree with pruning for fast discovery.
        scan_subdirectory_rules(&mut prompts, &project_root);
    }

    Ok(PromptScanResult { prompts })
}

/// Scan a project-level prompt file that can appear in two locations:
/// 1. $PROJECT_ROOT/<filename> (root-level)
/// 2. $PROJECT_ROOT/<config_dir>/<filename> (inside tool config dir)
///
/// Includes both if both exist, otherwise falls back to whichever location is found,
/// or includes the root-level path as "missing" if neither exists.
fn scan_project_prompt(
    prompts: &mut Vec<PromptFile>,
    tool: PromptSourceTool,
    project_root: &PathBuf,
    filename: &str,
    config_dir: &str,
) {
    let root_path = project_root.join(filename);
    let dir_path = project_root.join(config_dir).join(filename);

    let root_exists = root_path.exists();
    let dir_exists = dir_path.exists();

    if root_exists {
        prompts.push(scan_prompt_file(filename, tool, PromptScope::Project, &root_path));
    }
    if dir_exists {
        let name = format!("{}/{}", config_dir, filename);
        prompts.push(scan_prompt_file(&name, tool, PromptScope::Project, &dir_path));
    }
    // If neither exists, show the root-level path as missing
    if !root_exists && !dir_exists {
        prompts.push(scan_prompt_file(filename, tool, PromptScope::Project, &root_path));
    }
}

/// Recursively scan a rules directory for .md files
fn scan_rules_directory(
    prompts: &mut Vec<PromptFile>,
    tool: PromptSourceTool,
    scope: PromptScope,
    rules_dir: &Path,
) {
    if !rules_dir.is_dir() {
        return;
    }

    let mut entries = collect_md_files(rules_dir);
    entries.sort(); // deterministic order

    for path in entries {
        // Derive a friendly name relative to the rules dir
        let name = path
            .strip_prefix(rules_dir)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        prompts.push(scan_prompt_file(&name, tool, scope, &path));
    }
}

/// Recursively collect all .md files under a directory
fn collect_md_files(dir: &Path) -> Vec<PathBuf> {
    let mut results = Vec::new();
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return results,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            results.extend(collect_md_files(&path));
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            results.push(path);
        }
    }
    results
}

/// Directories to skip when walking the project tree for subdirectory rules
const PRUNE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".claude",
    ".codex",
    ".gemini",
    ".agents",
    "target",
    "build",
    "dist",
    ".cache",
    ".npm",
    ".cargo",
    ".rustup",
    ".local",
    ".nvm",
    ".pyenv",
    ".rbenv",
    ".pnpm-store",
    "venv",
    ".venv",
    "__pycache__",
    ".tox",
    ".next",
    ".nuxt",
    "coverage",
    ".turbo",
    ".output",
];

/// Target filenames to look for in subdirectories
const SUBDIR_TARGETS: &[(&str, PromptSourceTool)] = &[
    ("AGENTS.md", PromptSourceTool::Codex),
    ("AGENTS.override.md", PromptSourceTool::Codex),
    ("GEMINI.md", PromptSourceTool::Gemini),
];

/// Walk the project tree looking for AGENTS.md / AGENTS.override.md / GEMINI.md
/// in subdirectories. Skips the project root (already handled) and pruned directories.
fn scan_subdirectory_rules(prompts: &mut Vec<PromptFile>, project_root: &Path) {
    let prune_set: HashSet<&str> = PRUNE_DIRS.iter().copied().collect();
    let target_names: HashSet<&str> = SUBDIR_TARGETS.iter().map(|(name, _)| *name).collect();

    let walker = WalkDir::new(project_root)
        .max_depth(10)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_str().unwrap_or("");
            if entry.depth() > 0 && entry.file_type().is_dir() && prune_set.contains(name) {
                return false;
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        // Only look at files, not directories
        if !entry.file_type().is_file() {
            continue;
        }

        // Skip root-level files (already handled by scan_project_prompt)
        if entry.depth() <= 1 {
            continue;
        }

        let file_name = entry.file_name().to_str().unwrap_or("");
        if !target_names.contains(file_name) {
            continue;
        }

        // Find the matching tool
        let tool = SUBDIR_TARGETS
            .iter()
            .find(|(name, _)| *name == file_name)
            .map(|(_, tool)| *tool)
            .unwrap();

        let path = entry.path().to_path_buf();

        // Name is relative path from project root (e.g. "src/api/AGENTS.md")
        let display_name = path
            .strip_prefix(project_root)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        prompts.push(scan_prompt_file(&display_name, tool, PromptScope::Project, &path));
    }
}

/// Scan a single prompt file
fn scan_prompt_file(name: &str, tool: PromptSourceTool, scope: PromptScope, path: &PathBuf) -> PromptFile {
    let exists = path.exists();
    let (content, size) = if exists {
        match fs::read_to_string(path) {
            Ok(c) => {
                let len = c.len() as u64;
                (c, len)
            }
            Err(_) => (String::new(), 0),
        }
    } else {
        (String::new(), 0)
    };

    PromptFile {
        name: name.to_string(),
        source_tool: tool,
        scope,
        path: path.to_string_lossy().to_string(),
        exists,
        content,
        size,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_scan_prompt_file_exists() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("CLAUDE.md");
        let mut file = fs::File::create(&path).unwrap();
        writeln!(file, "# System Prompt\nBe helpful.").unwrap();

        let result = scan_prompt_file("CLAUDE.md", PromptSourceTool::Claude, PromptScope::Global, &path);
        assert!(result.exists);
        assert_eq!(result.name, "CLAUDE.md");
        assert!(result.content.contains("Be helpful"));
        assert!(result.size > 0);
    }

    #[test]
    fn test_scan_prompt_file_missing() {
        let path = PathBuf::from("/nonexistent/CLAUDE.md");
        let result = scan_prompt_file("CLAUDE.md", PromptSourceTool::Claude, PromptScope::Global, &path);
        assert!(!result.exists);
        assert!(result.content.is_empty());
        assert_eq!(result.size, 0);
    }

    #[test]
    fn test_scan_rules_directory() {
        let dir = TempDir::new().unwrap();
        let rules_dir = dir.path().join("rules");
        fs::create_dir(&rules_dir).unwrap();

        // Create some rule files
        fs::write(rules_dir.join("code-style.md"), "# Code style rules").unwrap();
        fs::write(rules_dir.join("testing.md"), "# Testing rules").unwrap();

        // Create a subdirectory with a rule
        let sub_dir = rules_dir.join("frontend");
        fs::create_dir(&sub_dir).unwrap();
        fs::write(sub_dir.join("react.md"), "# React rules").unwrap();

        // Non-md file should be ignored
        fs::write(rules_dir.join("notes.txt"), "not a rule").unwrap();

        let mut prompts = Vec::new();
        scan_rules_directory(
            &mut prompts,
            PromptSourceTool::Claude,
            PromptScope::Project,
            &rules_dir,
        );

        assert_eq!(prompts.len(), 3);
        let names: Vec<&str> = prompts.iter().map(|p| p.name.as_str()).collect();
        assert!(names.contains(&"code-style.md"));
        assert!(names.contains(&"testing.md"));
        assert!(names.contains(&"frontend/react.md"));
    }

    #[test]
    fn test_scan_subdirectory_rules() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        // Create subdirectory structure
        let api_dir = root.join("src").join("api");
        fs::create_dir_all(&api_dir).unwrap();
        fs::write(api_dir.join("AGENTS.md"), "# API instructions").unwrap();
        fs::write(api_dir.join("GEMINI.md"), "# Gemini API context").unwrap();

        let payments_dir = root.join("services").join("payments");
        fs::create_dir_all(&payments_dir).unwrap();
        fs::write(
            payments_dir.join("AGENTS.override.md"),
            "# Payment overrides",
        )
        .unwrap();

        // Root-level files should be skipped (depth 1)
        fs::write(root.join("AGENTS.md"), "# Root agents").unwrap();

        // Pruned dirs should be skipped
        let nm_dir = root.join("node_modules").join("pkg");
        fs::create_dir_all(&nm_dir).unwrap();
        fs::write(nm_dir.join("AGENTS.md"), "# Should be ignored").unwrap();

        let mut prompts = Vec::new();
        scan_subdirectory_rules(&mut prompts, root);

        assert_eq!(prompts.len(), 3);
        let names: Vec<&str> = prompts.iter().map(|p| p.name.as_str()).collect();
        assert!(names.iter().any(|n| n.ends_with("api/AGENTS.md")));
        assert!(names.iter().any(|n| n.ends_with("api/GEMINI.md")));
        assert!(names
            .iter()
            .any(|n| n.ends_with("payments/AGENTS.override.md")));
    }
}
