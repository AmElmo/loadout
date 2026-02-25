//! Automatic backup before every write operation

use chrono::Utc;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// Maximum number of backups to keep per original file
const MAX_BACKUPS_PER_FILE: usize = 10;

/// Maximum age of backups in days
const MAX_BACKUP_AGE_DAYS: u64 = 30;

/// Ensure the backup directory exists and return its path
fn ensure_backup_dir() -> Result<PathBuf, String> {
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
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

/// Extract the original filename from a backup filename.
/// Backup format: `{original_name}_{YYYYMMDD_HHMMSS}`
/// e.g., `config.toml_20260115_143022` -> `config.toml`
fn extract_original_name(backup_filename: &str) -> Option<&str> {
    // Look for the pattern _YYYYMMDD_HHMMSS at the end (16 chars: _8_6)
    if backup_filename.len() < 16 {
        return None;
    }
    let suffix_start = backup_filename.len() - 16;
    let suffix = &backup_filename[suffix_start..];

    // Verify the suffix matches _YYYYMMDD_HHMMSS pattern
    if suffix.as_bytes()[0] == b'_'
        && suffix[1..9].chars().all(|c| c.is_ascii_digit())
        && suffix.as_bytes()[9] == b'_'
        && suffix[10..].chars().all(|c| c.is_ascii_digit())
    {
        Some(&backup_filename[..suffix_start])
    } else {
        None
    }
}

/// Prune old backups. Keeps at most `MAX_BACKUPS_PER_FILE` per original file
/// and deletes anything older than `MAX_BACKUP_AGE_DAYS`.
/// Designed to run silently on app startup.
pub fn cleanup_old_backups() {
    let backup_dir = match ensure_backup_dir() {
        Ok(d) => d,
        Err(_) => return,
    };

    let max_age = Duration::from_secs(MAX_BACKUP_AGE_DAYS * 24 * 60 * 60);
    let now = SystemTime::now();

    // Collect all backup entries grouped by original filename
    let mut groups: HashMap<String, Vec<(PathBuf, SystemTime)>> = HashMap::new();

    let entries = match fs::read_dir(&backup_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let filename = match path.file_name().and_then(|f| f.to_str()) {
            Some(f) => f.to_string(),
            None => continue,
        };

        let original_name = match extract_original_name(&filename) {
            Some(n) => n.to_string(),
            None => continue,
        };

        let modified = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .unwrap_or(SystemTime::UNIX_EPOCH);

        groups.entry(original_name).or_default().push((path, modified));
    }

    // For each group, enforce both age and count limits
    for (_name, mut backups) in groups {
        // Sort by modification time, newest first
        backups.sort_by(|a, b| b.1.cmp(&a.1));

        for (i, (path, modified)) in backups.iter().enumerate() {
            let is_too_old = now.duration_since(*modified).unwrap_or_default() > max_age;
            let is_over_limit = i >= MAX_BACKUPS_PER_FILE;

            if is_too_old || is_over_limit {
                let _ = fs::remove_file(path);
            }
        }
    }
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

    #[test]
    fn test_extract_original_name() {
        assert_eq!(
            extract_original_name("config.toml_20260115_143022"),
            Some("config.toml")
        );
        assert_eq!(
            extract_original_name(".claude.json_20260210_091500"),
            Some(".claude.json")
        );
        assert_eq!(extract_original_name("too_short"), None);
        assert_eq!(extract_original_name("no_timestamp_here.txt"), None);
    }

    #[test]
    fn test_cleanup_keeps_recent_removes_excess() {
        let dir = TempDir::new().unwrap();
        let backup_dir = dir.path();

        // Create 15 fake backups for "config.json"
        for i in 0..15 {
            let name = format!("config.json_20260201_{:06}", i);
            let path = backup_dir.join(&name);
            fs::write(&path, format!("backup {}", i)).unwrap();
        }

        // Verify we start with 15 files
        let count_before = fs::read_dir(backup_dir).unwrap().count();
        assert_eq!(count_before, 15);

        // Run cleanup directly on this directory
        let max_age = Duration::from_secs(MAX_BACKUP_AGE_DAYS * 24 * 60 * 60);
        let now = SystemTime::now();
        let mut groups: HashMap<String, Vec<(PathBuf, SystemTime)>> = HashMap::new();

        for entry in fs::read_dir(backup_dir).unwrap().filter_map(|e| e.ok()) {
            let path = entry.path();
            let filename = path.file_name().unwrap().to_str().unwrap().to_string();
            if let Some(original) = extract_original_name(&filename) {
                let modified = entry.metadata().unwrap().modified().unwrap();
                groups
                    .entry(original.to_string())
                    .or_default()
                    .push((path, modified));
            }
        }

        for (_name, mut backups) in groups {
            backups.sort_by(|a, b| b.1.cmp(&a.1));
            for (i, (path, modified)) in backups.iter().enumerate() {
                let is_too_old = now.duration_since(*modified).unwrap_or_default() > max_age;
                let is_over_limit = i >= MAX_BACKUPS_PER_FILE;
                if is_too_old || is_over_limit {
                    let _ = fs::remove_file(path);
                }
            }
        }

        let count_after = fs::read_dir(backup_dir).unwrap().count();
        assert_eq!(count_after, MAX_BACKUPS_PER_FILE);
    }
}
