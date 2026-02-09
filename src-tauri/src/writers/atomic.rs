//! Atomic write pattern: write to temp file, then rename

use super::backup::create_backup;
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::NamedTempFile;

/// Atomically write content to a file.
///
/// 1. Creates a backup of the existing file (if it exists)
/// 2. Writes content to a temporary file in the same directory
/// 3. Atomically renames the temp file to the target path
///
/// This ensures the file is never in a partial/corrupted state.
pub fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
    }

    // Backup existing file
    create_backup(path)?;

    // Write to temp file in the same directory (required for atomic rename)
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid file path: no parent directory".to_string())?;

    let mut temp = NamedTempFile::new_in(parent)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    temp.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write to temp file: {}", e))?;

    temp.flush()
        .map_err(|e| format!("Failed to flush temp file: {}", e))?;

    // Atomic rename
    temp.persist(path)
        .map_err(|e| format!("Failed to persist file to {}: {}", path.display(), e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_atomic_write_new_file() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("new.json");

        atomic_write(&file_path, r#"{"key": "value"}"#).unwrap();

        assert!(file_path.exists());
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, r#"{"key": "value"}"#);
    }

    #[test]
    fn test_atomic_write_overwrite() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("existing.json");
        fs::write(&file_path, r#"{"old": true}"#).unwrap();

        atomic_write(&file_path, r#"{"new": true}"#).unwrap();

        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, r#"{"new": true}"#);
    }

    #[test]
    fn test_atomic_write_creates_parent_dirs() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("sub").join("dir").join("file.json");

        atomic_write(&file_path, r#"{"nested": true}"#).unwrap();

        assert!(file_path.exists());
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, r#"{"nested": true}"#);
    }
}
