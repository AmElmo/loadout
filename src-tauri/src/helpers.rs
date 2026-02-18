//! Shared helpers used across the application

use std::path::PathBuf;

/// Returns the effective home directory.
///
/// In debug builds, checks the `LOADOUT_HOME` environment variable first,
/// allowing test fixtures to override the home directory. Falls back to
/// `dirs::home_dir()`.
///
/// In release builds, the `LOADOUT_HOME` check is compiled out entirely
/// via `#[cfg(debug_assertions)]`, so there is zero runtime cost.
pub fn effective_home() -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    if let Ok(home) = std::env::var("LOADOUT_HOME") {
        let path = PathBuf::from(home);
        // Resolve relative paths (e.g. "./fixtures/home") against the current dir
        if path.is_relative() {
            if let Ok(cwd) = std::env::current_dir() {
                return Some(cwd.join(path));
            }
        }
        return Some(path);
    }
    dirs::home_dir()
}
