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

/// Reveal a file or directory in the native file manager.
///
/// - macOS: Finder (`open -R` for files)
/// - Windows: Explorer (`/select,` for files)
/// - Linux: Opens the directory in default file manager
#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let requested = PathBuf::from(&path);
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
}
