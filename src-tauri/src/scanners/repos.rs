//! Repo scanner for finding git repositories without AI rules files.
//!
//! Scans the user's home directory for `.git` repositories and identifies
//! which ones have no rules files (CLAUDE.md, AGENTS.md, GEMINI.md, etc.).
//! Extracts git metadata (last commit, branch, commit count) for each repo.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;
use std::process::Command;
use std::time::Duration;
use walkdir::WalkDir;

/// A git repo that has no AI rules files
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoWithoutRules {
    /// Absolute path to the repo root
    pub path: String,
    /// Short name (last path component)
    pub name: String,
    /// ISO 8601 date of the most recent commit
    pub last_commit_date: Option<String>,
    /// First line of the most recent commit message
    pub last_commit_message: Option<String>,
    /// Author of the most recent commit
    pub last_commit_author: Option<String>,
    /// Approximate commit count
    pub commit_count: Option<u32>,
    /// Current branch name
    pub current_branch: Option<String>,
}

/// Result of scanning repos for missing rules
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoScanResult {
    pub repos: Vec<RepoWithoutRules>,
    pub total_repos_scanned: u32,
    pub repos_with_rules: u32,
    pub repos_without_rules: u32,
    pub scan_duration_ms: u64,
}

/// Directories to skip during scanning (same strategy as workspaces.rs)
const PRUNE_DIRS: &[&str] = &[
    "node_modules",
    "Library",
    ".Trash",
    "Applications",
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
    "Pictures",
    "Music",
    "Movies",
    "Downloads",
];

/// Rules files to check at each repo root.
/// If ANY of these exist, the repo "has rules" and is excluded from results.
const RULES_FILES: &[&str] = &[
    // Claude
    "CLAUDE.md",
    // Codex
    "AGENTS.md",
    // Gemini
    "GEMINI.md",
    // Cursor
    ".cursorrules",
    // Windsurf
    ".windsurfrules",
    // Cline
    ".clinerules",
];

/// Rules files inside subdirectories (path relative to repo root).
const RULES_SUBDIR_FILES: &[&str] = &[
    // Claude
    ".claude/CLAUDE.md",
    // Codex
    ".codex/AGENTS.md",
    // Gemini
    ".gemini/GEMINI.md",
    // Copilot
    ".github/copilot-instructions.md",
];

/// Directories that, if non-empty, indicate rules exist.
const RULES_DIRS: &[&str] = &[
    // Claude
    ".claude/rules",
    // Gemini
    ".gemini/rules",
    // Cursor
    ".cursor/rules",
    // Copilot
    ".github/instructions",
    // Windsurf
    ".windsurf/rules",
    // Amp
    ".amp/rules",
    // Roo Code
    ".roo/rules",
    // Cline
    ".cline/rules",
    // Kilo Code
    ".kilocode/rules",
];

/// Check if a repo has any rules files
fn has_any_rules(repo_root: &Path) -> bool {
    // Check top-level files
    for file in RULES_FILES {
        if repo_root.join(file).is_file() {
            return true;
        }
    }

    // Check subdir files
    for file in RULES_SUBDIR_FILES {
        if repo_root.join(file).is_file() {
            return true;
        }
    }

    // Check non-empty rule directories
    for dir in RULES_DIRS {
        let dir_path = repo_root.join(dir);
        if dir_path.is_dir() {
            if let Ok(mut entries) = std::fs::read_dir(&dir_path) {
                if entries.next().is_some() {
                    return true;
                }
            }
        }
    }

    false
}

/// Run a git command with a timeout, returning stdout as a String
fn git_command(repo_path: &Path, args: &[&str], timeout: Duration) -> Option<String> {
    let mut cmd = Command::new("git");
    cmd.arg("-C")
        .arg(repo_path)
        .args(args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null());

    let child = cmd.spawn().ok()?;

    // Use a simple wait with timeout approach
    let output = wait_with_timeout(child, timeout)?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            None
        } else {
            Some(stdout)
        }
    } else {
        None
    }
}

/// Wait for a child process with a timeout
fn wait_with_timeout(
    mut child: std::process::Child,
    timeout: Duration,
) -> Option<std::process::Output> {
    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let stdout = child.stdout.take().map_or_else(Vec::new, |mut s| {
                    let mut buf = Vec::new();
                    std::io::Read::read_to_end(&mut s, &mut buf).ok();
                    buf
                });
                return Some(std::process::Output {
                    status,
                    stdout,
                    stderr: Vec::new(),
                });
            }
            Ok(None) => {
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(_) => return None,
        }
    }
}

/// Extract git metadata for a repo
fn extract_git_metadata(repo_path: &Path) -> RepoWithoutRules {
    let name = repo_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let path = repo_path.to_string_lossy().to_string();
    let timeout = Duration::from_secs(2);

    // Last commit info (date, message, author in one call)
    let (last_commit_date, last_commit_message, last_commit_author) =
        match git_command(repo_path, &["log", "-1", "--format=%aI|%s|%an"], timeout) {
            Some(output) => {
                let parts: Vec<&str> = output.splitn(3, '|').collect();
                (
                    parts.first().map(|s| s.to_string()),
                    parts.get(1).map(|s| s.to_string()),
                    parts.get(2).map(|s| s.to_string()),
                )
            }
            None => (None, None, None),
        };

    // Commit count (can be slow on huge repos)
    let commit_count = git_command(repo_path, &["rev-list", "--count", "HEAD"], timeout)
        .and_then(|s| s.parse::<u32>().ok());

    // Current branch
    let current_branch = git_command(repo_path, &["branch", "--show-current"], timeout);

    RepoWithoutRules {
        path,
        name,
        last_commit_date,
        last_commit_message,
        last_commit_author,
        commit_count,
        current_branch,
    }
}

/// Scan for git repos without rules files
pub fn scan_repos_without_rules(max_depth: u32) -> Result<RepoScanResult, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let start = std::time::Instant::now();

    // Check if git is available
    if Command::new("git")
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_err()
    {
        return Err("Git is not installed or not found in PATH".to_string());
    }

    let prune_set: HashSet<&str> = PRUNE_DIRS.iter().copied().collect();

    let mut total_repos: u32 = 0;
    let mut repos_with_rules: u32 = 0;
    let mut repos_without: Vec<RepoWithoutRules> = Vec::new();

    // Track which directories are repo roots so we can skip descending into them
    let mut repo_roots: HashSet<std::path::PathBuf> = HashSet::new();

    let walker = WalkDir::new(&home_dir)
        .max_depth(max_depth as usize)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_str().unwrap_or("");
            // Prune known heavy directories
            if entry.depth() > 0 && prune_set.contains(name) {
                return false;
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        // Skip the home directory itself
        if entry.depth() == 0 {
            continue;
        }

        let entry_path = entry.path();

        // Check if this entry is inside an already-discovered repo
        if repo_roots.iter().any(|root| entry_path.starts_with(root)) {
            continue;
        }

        // Only look at directories
        if !entry.file_type().is_dir() {
            continue;
        }

        let git_path = entry_path.join(".git");

        // Only consider repos where .git is a directory (skip submodules/worktrees where .git is a file)
        if !git_path.is_dir() {
            continue;
        }

        // This is a repo root - track it so we don't descend further
        repo_roots.insert(entry_path.to_path_buf());
        total_repos += 1;

        // Check if this repo has any rules files
        if has_any_rules(entry_path) {
            repos_with_rules += 1;
            continue;
        }

        // Extract git metadata for repos without rules
        let repo = extract_git_metadata(entry_path);
        repos_without.push(repo);
    }

    // Sort by last commit date descending (most recent first)
    repos_without.sort_by(|a, b| {
        let date_a = a.last_commit_date.as_deref().unwrap_or("");
        let date_b = b.last_commit_date.as_deref().unwrap_or("");
        date_b.cmp(date_a)
    });

    let repos_without_count = repos_without.len() as u32;
    let duration = start.elapsed();

    Ok(RepoScanResult {
        repos: repos_without,
        total_repos_scanned: total_repos,
        repos_with_rules,
        repos_without_rules: repos_without_count,
        scan_duration_ms: duration.as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Mutex, OnceLock};
    use tempfile::TempDir;

    fn with_loadout_home<T>(home: &Path, f: impl FnOnce() -> T) -> T {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        let _guard = LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();

        let previous = std::env::var("LOADOUT_HOME").ok();
        std::env::set_var("LOADOUT_HOME", home);
        let result = f();
        if let Some(prev) = previous {
            std::env::set_var("LOADOUT_HOME", prev);
        } else {
            std::env::remove_var("LOADOUT_HOME");
        }
        result
    }

    #[test]
    fn test_has_any_rules_with_claude_md() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("my-project");
        fs::create_dir_all(&repo).unwrap();
        fs::write(repo.join("CLAUDE.md"), "# Rules").unwrap();
        assert!(has_any_rules(&repo));
    }

    #[test]
    fn test_has_any_rules_with_agents_md() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("my-project");
        fs::create_dir_all(&repo).unwrap();
        fs::write(repo.join("AGENTS.md"), "# Agents").unwrap();
        assert!(has_any_rules(&repo));
    }

    #[test]
    fn test_has_any_rules_with_cursor_rules_dir() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("my-project");
        let rules_dir = repo.join(".cursor/rules");
        fs::create_dir_all(&rules_dir).unwrap();
        fs::write(rules_dir.join("rule.md"), "# Rule").unwrap();
        assert!(has_any_rules(&repo));
    }

    #[test]
    fn test_has_any_rules_empty_rules_dir() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("my-project");
        let rules_dir = repo.join(".cursor/rules");
        fs::create_dir_all(&rules_dir).unwrap();
        // Empty dir should NOT count as having rules
        assert!(!has_any_rules(&repo));
    }

    #[test]
    fn test_has_any_rules_none() {
        let tmp = TempDir::new().unwrap();
        let repo = tmp.path().join("my-project");
        fs::create_dir_all(&repo).unwrap();
        assert!(!has_any_rules(&repo));
    }

    #[test]
    fn test_scan_finds_repos_without_rules() {
        let home = TempDir::new().unwrap();

        // Repo with rules — should be excluded
        let with_rules = home.path().join("projects/with-rules");
        fs::create_dir_all(with_rules.join(".git")).unwrap();
        fs::write(with_rules.join("CLAUDE.md"), "# Rules").unwrap();

        // Repo without rules — should be included
        let without_rules = home.path().join("projects/without-rules");
        fs::create_dir_all(without_rules.join(".git")).unwrap();

        let result = with_loadout_home(home.path(), || scan_repos_without_rules(5)).unwrap();

        assert_eq!(result.total_repos_scanned, 2);
        assert_eq!(result.repos_with_rules, 1);
        assert_eq!(result.repos_without_rules, 1);
        assert_eq!(result.repos[0].name, "without-rules");
    }

    #[test]
    fn test_scan_skips_submodules() {
        let home = TempDir::new().unwrap();

        // Repo with .git as file (submodule) — should be skipped
        let submodule = home.path().join("projects/submodule-repo");
        fs::create_dir_all(&submodule).unwrap();
        fs::write(
            submodule.join(".git"),
            "gitdir: ../.git/modules/submodule-repo",
        )
        .unwrap();

        let result = with_loadout_home(home.path(), || scan_repos_without_rules(5)).unwrap();
        assert_eq!(result.total_repos_scanned, 0);
    }

    #[test]
    fn test_scan_skips_pruned_dirs() {
        let home = TempDir::new().unwrap();

        // Repo inside node_modules — should be skipped
        let nm_repo = home.path().join("projects/app/node_modules/some-pkg");
        fs::create_dir_all(nm_repo.join(".git")).unwrap();

        let result = with_loadout_home(home.path(), || scan_repos_without_rules(6)).unwrap();
        assert_eq!(result.total_repos_scanned, 0);
    }

    #[test]
    fn test_repo_serialization() {
        let repo = RepoWithoutRules {
            path: "/test/project".to_string(),
            name: "project".to_string(),
            last_commit_date: Some("2024-01-15T10:30:00+00:00".to_string()),
            last_commit_message: Some("feat: initial commit".to_string()),
            last_commit_author: Some("Dev".to_string()),
            commit_count: Some(42),
            current_branch: Some("main".to_string()),
        };

        let json = serde_json::to_string(&repo).unwrap();
        assert!(json.contains("\"lastCommitDate\""));
        assert!(json.contains("\"commitCount\":42"));
        assert!(json.contains("\"currentBranch\":\"main\""));
    }
}
