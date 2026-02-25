//! Automatic backup before every write operation

use chrono::Utc;
use std::collections::HashMap;
use std::fs;
use std::hash::Hasher;
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

/// A minimal FNV-1a hasher operating on raw bytes.
/// Unlike `DefaultHasher`, the algorithm is fully specified here and will never
/// change across Rust toolchain versions, making the backup filename format stable.
struct Fnv1aHasher(u64);

impl Fnv1aHasher {
    const BASIS: u64 = 0xcbf29ce484222325;
    const PRIME: u64 = 0x00000100000001B3;

    fn new() -> Self {
        Self(Self::BASIS)
    }
}

impl Hasher for Fnv1aHasher {
    fn write(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.0 ^= b as u64;
            self.0 = self.0.wrapping_mul(Self::PRIME);
        }
    }
    fn finish(&self) -> u64 {
        self.0
    }
}

/// Produce a 6-character hex hash of a path to disambiguate files with the same
/// basename from different directories (e.g. `~/.claude/settings.json` vs
/// `~/.gemini/settings.json`).
///
/// Uses FNV-1a over the canonical path bytes so the result is stable across
/// Rust toolchain versions.
fn path_hash(path: &Path) -> String {
    let canonical = path
        .canonicalize()
        .unwrap_or_else(|_| path.to_path_buf());
    let mut hasher = Fnv1aHasher::new();
    hasher.write(canonical.as_os_str().as_encoded_bytes());
    let hash = hasher.finish();
    format!("{:06x}", hash & 0xFFFFFF)
}

/// Create a timestamped backup of a file before modifying it.
/// Returns the backup path if a backup was created, or None if the file didn't exist.
///
/// Backup filename format: `{basename}_{hash}_{YYYYMMDD_HHMMSS}`
/// where `hash` is a 6-char hex digest of the canonical source path.
pub fn create_backup(path: &Path) -> Result<Option<PathBuf>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let backup_dir = ensure_backup_dir()?;
    let filename = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy();
    let hash = path_hash(path);
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("{}_{}_{}", filename, hash, timestamp);
    let backup_path = backup_dir.join(backup_filename);

    fs::copy(path, &backup_path)
        .map_err(|e| format!("Failed to create backup of {}: {}", path.display(), e))?;

    Ok(Some(backup_path))
}

/// Extract the cleanup group key from a backup filename.
///
/// New format: `{basename}_{hash}_{YYYYMMDD_HHMMSS}` → group key `{basename}_{hash}`
/// Old format: `{basename}_{YYYYMMDD_HHMMSS}`          → group key `{basename}`
///
/// Both formats are recognised so that pre-migration backups are still cleaned up.
fn extract_group_key(backup_filename: &str) -> Option<&str> {
    // The timestamp suffix is always `_YYYYMMDD_HHMMSS` (16 chars).
    if backup_filename.len() < 16 {
        return None;
    }

    let suffix_start = backup_filename.len() - 16;
    let suffix = &backup_filename[suffix_start..];

    let is_timestamp = suffix.as_bytes()[0] == b'_'
        && suffix[1..9].chars().all(|c| c.is_ascii_digit())
        && suffix.as_bytes()[9] == b'_'
        && suffix[10..].chars().all(|c| c.is_ascii_digit());

    if !is_timestamp {
        return None;
    }

    // Everything before the timestamp is the group key.
    // For new-format files this is `{basename}_{hash}`, for old-format it's `{basename}`.
    Some(&backup_filename[..suffix_start])
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

        let group_key = match extract_group_key(&filename) {
            Some(k) => k.to_string(),
            None => continue,
        };

        let modified = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .unwrap_or(SystemTime::UNIX_EPOCH);

        groups.entry(group_key).or_default().push((path, modified));
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

        // Verify the backup filename contains a 6-char hash segment
        let backup_name = backup.file_name().unwrap().to_str().unwrap();
        // Format: test.json_{hash}_{YYYYMMDD_HHMMSS}
        assert!(backup_name.starts_with("test.json_"));
        // After stripping the timestamp suffix (16 chars) and the basename + underscore,
        // we should have a 6-char hex hash.
        let without_timestamp = &backup_name[..backup_name.len() - 16];
        let hash_part = &without_timestamp["test.json_".len()..];
        assert_eq!(hash_part.len(), 6, "hash should be 6 hex chars");
        assert!(
            hash_part.chars().all(|c| c.is_ascii_hexdigit()),
            "hash should be hex"
        );

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
    fn test_path_hash_different_dirs_same_basename() {
        // Two paths with the same basename but different parents must hash differently
        let a = path_hash(Path::new("/home/user/.claude/settings.json"));
        let b = path_hash(Path::new("/home/user/.gemini/settings.json"));
        assert_ne!(a, b, "hashes for different source paths must differ");
        assert_eq!(a.len(), 6);
        assert_eq!(b.len(), 6);
    }

    #[test]
    fn test_path_hash_stable() {
        let h1 = path_hash(Path::new("/some/path/file.txt"));
        let h2 = path_hash(Path::new("/some/path/file.txt"));
        assert_eq!(h1, h2, "hash must be deterministic");
    }

    #[test]
    fn test_extract_group_key_new_format() {
        // New format: basename_hash_YYYYMMDD_HHMMSS
        assert_eq!(
            extract_group_key("settings.json_a3f2b1_20260225_143022"),
            Some("settings.json_a3f2b1")
        );
        assert_eq!(
            extract_group_key("config.toml_00beef_20260115_143022"),
            Some("config.toml_00beef")
        );
    }

    #[test]
    fn test_extract_group_key_old_format() {
        // Old format (no hash): basename_YYYYMMDD_HHMMSS
        assert_eq!(
            extract_group_key("config.toml_20260115_143022"),
            Some("config.toml")
        );
        assert_eq!(
            extract_group_key(".claude.json_20260210_091500"),
            Some(".claude.json")
        );
    }

    #[test]
    fn test_extract_group_key_invalid() {
        assert_eq!(extract_group_key("too_short"), None);
        assert_eq!(extract_group_key("no_timestamp_here.txt"), None);
    }

    #[test]
    fn test_cleanup_keeps_recent_removes_excess() {
        let dir = TempDir::new().unwrap();
        let backup_dir = dir.path();

        // Create 15 fake backups for "config.json" with hash (new format)
        for i in 0..15 {
            let name = format!("config.json_abc123_20260201_{:06}", i);
            let path = backup_dir.join(&name);
            fs::write(&path, format!("backup {}", i)).unwrap();
        }

        let count_before = fs::read_dir(backup_dir).unwrap().count();
        assert_eq!(count_before, 15);

        run_cleanup_on_dir(backup_dir);

        let count_after = fs::read_dir(backup_dir).unwrap().count();
        assert_eq!(count_after, MAX_BACKUPS_PER_FILE);
    }

    #[test]
    fn test_cleanup_separates_same_basename_different_hash() {
        let dir = TempDir::new().unwrap();
        let backup_dir = dir.path();

        // 5 backups for settings.json from source A (hash aaa111)
        for i in 0..5 {
            let name = format!("settings.json_aaa111_20260201_{:06}", i);
            fs::write(backup_dir.join(&name), "a").unwrap();
        }

        // 5 backups for settings.json from source B (hash bbb222)
        for i in 0..5 {
            let name = format!("settings.json_bbb222_20260201_{:06}", i);
            fs::write(backup_dir.join(&name), "b").unwrap();
        }

        assert_eq!(fs::read_dir(backup_dir).unwrap().count(), 10);

        run_cleanup_on_dir(backup_dir);

        // Both groups are under the limit — all 10 should survive
        assert_eq!(fs::read_dir(backup_dir).unwrap().count(), 10);
    }

    #[test]
    fn test_cleanup_handles_old_format_backups() {
        let dir = TempDir::new().unwrap();
        let backup_dir = dir.path();

        // 12 old-format backups (no hash)
        for i in 0..12 {
            let name = format!("config.json_20260201_{:06}", i);
            fs::write(backup_dir.join(&name), "old").unwrap();
        }

        run_cleanup_on_dir(backup_dir);

        // Should be pruned to MAX_BACKUPS_PER_FILE
        assert_eq!(fs::read_dir(backup_dir).unwrap().count(), MAX_BACKUPS_PER_FILE);
    }

    /// Helper: run the cleanup logic on an arbitrary directory (mirrors cleanup_old_backups).
    fn run_cleanup_on_dir(backup_dir: &Path) {
        let max_age = Duration::from_secs(MAX_BACKUP_AGE_DAYS * 24 * 60 * 60);
        let now = SystemTime::now();
        let mut groups: HashMap<String, Vec<(PathBuf, SystemTime)>> = HashMap::new();

        for entry in fs::read_dir(backup_dir).unwrap().filter_map(|e| e.ok()) {
            let path = entry.path();
            let filename = path.file_name().unwrap().to_str().unwrap().to_string();
            if let Some(key) = extract_group_key(&filename) {
                let modified = entry.metadata().unwrap().modified().unwrap();
                groups
                    .entry(key.to_string())
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
    }
}
