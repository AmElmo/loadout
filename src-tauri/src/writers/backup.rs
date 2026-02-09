//! Automatic backup before every write operation

use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};

/// Ensure the backup directory exists and return its path
fn ensure_backup_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let backup_dir = home.join(".loadout").join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    Ok(backup_dir)
}

/// Create a timestamped backup of a file before modifying it.
/// Returns the backup path if a backup was created, or None if the file didn't exist.
pub fn create_backup(path: &Path) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let backup_dir = ensure_backup_dir()?;
    let filename = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy();
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("{}_{}", filename, timestamp);
    let backup_path = backup_dir.join(backup_filename);

    fs::copy(path, &backup_path)
        .map_err(|e| format!("Failed to create backup of {}: {}", path.display(), e))?;

    Ok(Some(backup_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_create_backup_existing_file() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.json");
        let mut file = fs::File::create(&file_path).unwrap();
        writeln!(file, r#"{{"key": "value"}}"#).unwrap();

        let result = create_backup(&file_path);
        assert!(result.is_ok());
        let backup_path = result.unwrap();
        assert!(backup_path.is_some());

        let backup = backup_path.unwrap();
        assert!(backup.exists());

        let original = fs::read_to_string(&file_path).unwrap();
        let backed_up = fs::read_to_string(&backup).unwrap();
        assert_eq!(original, backed_up);
    }

    #[test]
    fn test_create_backup_nonexistent_file() {
        let result = create_backup(Path::new("/nonexistent/file.json"));
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
}
