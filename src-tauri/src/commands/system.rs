//! Tauri commands for interacting with the host system shell.

use std::path::{Component, Path, PathBuf};
use std::process::Command;

use crate::writers::atomic::atomic_write;

fn nearest_existing_path(path: &Path) -> Option<PathBuf> {
    if path.exists() {
        return Some(path.to_path_buf());
    }

    let mut current = path.parent();
    while let Some(parent) = current {
        if parent.exists() {
            return Some(parent.to_path_buf());
        }
        current = parent.parent();
    }

    None
}

/// Normalize a path by resolving `.` and `..` components lexically (without touching the filesystem).
/// Returns `None` if the path tries to escape its root (more `..` than real components).
fn normalize_path(path: &Path) -> Option<PathBuf> {
    let mut parts: Vec<Component> = Vec::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                // Only pop Normal components; reject attempts to escape root/prefix
                if matches!(parts.last(), Some(Component::Normal(_))) {
                    parts.pop();
                } else {
                    return None; // would escape beyond the root
                }
            }
            Component::CurDir => {} // skip "."
            other => parts.push(other),
        }
    }
    Some(parts.iter().collect())
}

/// Check whether a path is within known safe directories for the reveal command.
/// Allows AI config directories under the home dir and discovered workspace paths.
/// The path is normalized first to prevent `..` traversal bypasses.
fn is_safe_reveal_path(path: &Path) -> bool {
    // Normalize to eliminate .. traversal before any prefix check
    let path = match normalize_path(path) {
        Some(p) => p,
        None => return false,
    };

    let home = match crate::helpers::effective_home() {
        Some(h) => h,
        None => return false,
    };

    // Known AI config directories under home (synced with workspace scanner signals)
    let allowed_prefixes = [
        home.join(".claude"),
        home.join(".codex"),
        home.join(".gemini"),
        home.join(".agents"),
        home.join(".loadout"),
        home.join(".cursor"),
        home.join(".windsurf"),
        home.join(".roo"),
        home.join(".cline"),
        home.join(".kilocode"),
        home.join(".opencode"),
        home.join(".vscode"),  // Copilot MCP config
        home.join(".github"),  // Copilot instructions
    ];

    if allowed_prefixes
        .iter()
        .any(|prefix| path.starts_with(prefix))
    {
        return true;
    }

    // Also allow the home-level claude.json config file
    if path == home.join(".claude.json") {
        return true;
    }

    // Allow paths within any project that contains AI config directories
    // (i.e., has .claude/, .codex/, .gemini/, .mcp.json, CLAUDE.md, etc.)
    // Walk up from the path to find a project root with AI signals.
    // This list is kept in sync with SIGNAL_NAMES in scanners/workspaces.rs.
    let ai_signals = [
        ".claude",
        ".codex",
        ".gemini",
        ".agents",
        ".mcp.json",
        "CLAUDE.md",
        "AGENTS.md",
        "GEMINI.md",
        "AGENT.md",
        ".cursor",
        ".github",
        ".vscode",
        ".windsurf",
        ".roo",
        ".roorules",
        ".roomodes",
        ".cline",
        ".clinerules",
        ".kilocode",
        ".kilocoderules",
        ".opencode",
        "opencode.json",
    ];

    let mut candidate = Some(path.as_path());
    while let Some(dir) = candidate {
        if dir == home {
            break; // Don't check home dir itself
        }
        for signal in &ai_signals {
            if dir.join(signal).exists() {
                return true;
            }
        }
        candidate = dir.parent();
    }

    false
}

/// Reveal a file or directory in the native file manager.
///
/// - macOS: Finder (`open -R` for files)
/// - Windows: Explorer (`/select,` for files)
/// - Linux: Opens the directory in default file manager
///
/// Validates that the path is within known safe directories (AI config paths or workspaces).
#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let requested = PathBuf::from(&path);

    // Normalize first to resolve .. segments, then validate scope
    let normalized = normalize_path(&requested).ok_or_else(|| {
        format!(
            "Path contains invalid traversal components: {}",
            path
        )
    })?;

    if !is_safe_reveal_path(&normalized) {
        return Err(format!(
            "Path is outside the allowed scope for reveal: {}",
            path
        ));
    }

    let target = nearest_existing_path(&normalized)
        .ok_or_else(|| format!("Path does not exist and no parent found: {}", path))?;
    let is_file = target.is_file();

    let status = if cfg!(target_os = "macos") {
        let mut cmd = Command::new("open");
        if is_file {
            cmd.arg("-R").arg(&target);
        } else {
            cmd.arg(&target);
        }
        cmd.status()
    } else if cfg!(target_os = "windows") {
        let mut cmd = Command::new("explorer");
        if is_file {
            cmd.arg(format!("/select,{}", target.to_string_lossy()));
        } else {
            cmd.arg(&target);
        }
        cmd.status()
    } else {
        // Most Linux file managers do not support selecting a specific file reliably.
        let open_target = if is_file {
            target
                .parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| target.clone())
        } else {
            target.clone()
        };

        Command::new("xdg-open").arg(open_target).status()
    }
    .map_err(|e| format!("Failed to open file manager: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "File manager command exited with status: {}",
            status
        ))
    }
}

/// Save text content to a file, using atomic write for safety.
#[tauri::command]
pub fn save_file_content(path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    atomic_write(&file_path, &content)
}

/// Save skill body content while preserving YAML frontmatter.
///
/// Reads the existing file to extract frontmatter, then replaces only the
/// markdown body while keeping the `---` delimited header intact.
#[tauri::command]
pub fn save_skill_content(path: String, body: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let raw = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;

    let trimmed = raw.trim();
    let new_content = if trimmed.starts_with("---") {
        // Preserve frontmatter: everything up to and including the closing ---
        if let Some(end) = trimmed[3..].find("\n---") {
            let frontmatter = &trimmed[..3 + end + 4]; // include closing ---
            format!("{}\n\n{}\n", frontmatter, body.trim())
        } else {
            // No valid closing delimiter — write body as-is
            format!("{}\n", body)
        }
    } else {
        // No frontmatter — the content IS the full file
        format!("{}\n", body)
    };

    atomic_write(&file_path, &new_content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_existing_path_as_is() {
        let dir = tempfile::tempdir().unwrap();
        let existing = dir.path().join("file.txt");
        std::fs::write(&existing, "x").unwrap();

        let resolved = nearest_existing_path(&existing).unwrap();
        assert_eq!(resolved, existing);
    }

    #[test]
    fn falls_back_to_existing_parent() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("a").join("b").join("c.txt");

        let resolved = nearest_existing_path(&missing).unwrap();
        assert_eq!(resolved, dir.path().to_path_buf());
    }

    #[test]
    fn safe_path_allows_claude_config() {
        let home = crate::helpers::effective_home().unwrap();
        let path = home.join(".claude").join("settings.json");
        assert!(is_safe_reveal_path(&path));
    }

    #[test]
    fn safe_path_allows_loadout_config() {
        let home = crate::helpers::effective_home().unwrap();
        let path = home.join(".loadout").join("backups").join("test.json");
        assert!(is_safe_reveal_path(&path));
    }

    #[test]
    fn safe_path_rejects_arbitrary_path() {
        assert!(!is_safe_reveal_path(Path::new("/tmp/evil/path")));
    }

    #[test]
    fn safe_path_allows_workspace_with_ai_signals() {
        let dir = tempfile::tempdir().unwrap();
        let workspace = dir.path().join("my-project");
        std::fs::create_dir_all(workspace.join(".claude")).unwrap();
        let target = workspace.join("src").join("main.rs");
        std::fs::create_dir_all(target.parent().unwrap()).unwrap();
        std::fs::write(&target, "fn main() {}").unwrap();

        assert!(is_safe_reveal_path(&target));
    }

    #[test]
    fn safe_path_rejects_dotdot_traversal() {
        // ~/.claude/../Documents/secret should NOT pass
        let home = crate::helpers::effective_home().unwrap();
        let traversal = home.join(".claude").join("..").join("Documents").join("secret");
        assert!(!is_safe_reveal_path(&traversal));
    }

    #[test]
    fn safe_path_allows_vscode_config() {
        let home = crate::helpers::effective_home().unwrap();
        let path = home.join(".vscode").join("mcp.json");
        assert!(is_safe_reveal_path(&path));
    }

    #[test]
    fn safe_path_allows_github_config() {
        let home = crate::helpers::effective_home().unwrap();
        let path = home.join(".github").join("copilot-instructions.md");
        assert!(is_safe_reveal_path(&path));
    }

    #[test]
    fn normalize_resolves_dotdot() {
        let normalized = normalize_path(Path::new("/a/b/../c")).unwrap();
        assert_eq!(normalized, PathBuf::from("/a/c"));
    }

    #[test]
    fn normalize_resolves_dot() {
        let normalized = normalize_path(Path::new("/a/./b")).unwrap();
        assert_eq!(normalized, PathBuf::from("/a/b"));
    }

    #[test]
    fn normalize_rejects_escape_beyond_root() {
        // Trying to go above root should fail
        assert!(normalize_path(Path::new("/a/../../b")).is_none());
    }
}
