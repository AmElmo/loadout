//! Tauri commands for interacting with the host system shell.

use std::path::{Path, PathBuf};
use std::process::Command;

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

/// Check whether a path is within known safe directories for the reveal command.
/// Allows AI config directories under the home dir and discovered workspace paths.
fn is_safe_reveal_path(path: &Path) -> bool {
    let home = match crate::helpers::effective_home() {
        Some(h) => h,
        None => return false,
    };

    // Known AI config directories under home
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
    // Walk up from the path to find a project root with AI signals
    let ai_signals = [
        ".claude",
        ".codex",
        ".gemini",
        ".agents",
        ".mcp.json",
        "CLAUDE.md",
        "AGENTS.md",
        "GEMINI.md",
        ".cursor",
        ".windsurf",
        ".opencode",
        "opencode.json",
    ];

    let mut candidate = Some(path);
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

    // Validate path is within safe scope
    if !is_safe_reveal_path(&requested) {
        return Err(format!(
            "Path is outside the allowed scope for reveal: {}",
            path
        ));
    }

    let target = nearest_existing_path(&requested)
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
}
