//! Workspace discovery scanner
//!
//! Scans the user's home directory for projects that have AI CLI config files
//! (.claude/, .codex/, .gemini/, .mcp.json, CLAUDE.md, AGENTS.md, GEMINI.md).
//! Uses walkdir with pruning to stay fast (~200ms for depth 4).

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use walkdir::WalkDir;

/// What AI CLI artifacts were found in a workspace
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSignals {
    pub has_claude_config: bool,
    pub has_codex_config: bool,
    pub has_gemini_config: bool,
    pub has_mcp_json: bool,
    pub has_claude_prompt: bool,
    pub has_codex_prompt: bool,
    pub has_gemini_prompt: bool,
    pub has_claude_skills: bool,
    pub has_codex_skills: bool,
    pub has_gemini_skills: bool,
    pub has_cursor_config: bool,
    pub has_cursor_rules: bool,
    pub has_cursor_mcps: bool,
    pub has_copilot_config: bool,
    pub has_copilot_rules: bool,
    pub has_windsurf_config: bool,
    pub has_windsurf_rules: bool,
    pub has_roo_config: bool,
    pub has_roo_rules: bool,
    pub has_cline_config: bool,
    pub has_cline_rules: bool,
    pub has_kilo_config: bool,
    pub has_kilo_rules: bool,
    pub has_open_code_config: bool,
    pub has_open_code_rules: bool,
}

impl WorkspaceSignals {
    fn tool_count(&self) -> u8 {
        let mut count = 0;
        if self.has_claude_config || self.has_claude_prompt || self.has_claude_skills {
            count += 1;
        }
        if self.has_codex_config || self.has_codex_prompt || self.has_codex_skills {
            count += 1;
        }
        if self.has_gemini_config || self.has_gemini_prompt || self.has_gemini_skills {
            count += 1;
        }
        if self.has_cursor_config || self.has_cursor_rules || self.has_cursor_mcps {
            count += 1;
        }
        if self.has_copilot_config || self.has_copilot_rules {
            count += 1;
        }
        if self.has_windsurf_config || self.has_windsurf_rules {
            count += 1;
        }
        if self.has_roo_config || self.has_roo_rules {
            count += 1;
        }
        if self.has_cline_config || self.has_cline_rules {
            count += 1;
        }
        if self.has_kilo_config || self.has_kilo_rules {
            count += 1;
        }
        if self.has_open_code_config || self.has_open_code_rules {
            count += 1;
        }
        count
    }
}

/// A discovered workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredWorkspace {
    /// Absolute path to the workspace root
    pub path: String,
    /// Short name (last path component)
    pub name: String,
    /// Whether this is a git repo
    pub is_git_repo: bool,
    /// What signals were found
    pub signals: WorkspaceSignals,
    /// How many distinct tools have configs here
    pub tool_count: u8,
}

/// Result of workspace discovery
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryResult {
    pub workspaces: Vec<DiscoveredWorkspace>,
    pub scan_depth: u32,
    pub scan_duration_ms: u64,
}

/// Directories to prune during scanning (saves enormous time)
const PRUNE_DIRS: &[&str] = &[
    "node_modules",
    ".git",
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

/// Signal files/dirs we look for to identify AI CLI workspaces
const SIGNAL_NAMES: &[&str] = &[
    ".claude",
    ".codex",
    ".gemini",
    ".mcp.json",
    "CLAUDE.md",
    "AGENTS.md",
    "GEMINI.md",
    ".agents",
    ".cursor",
    ".github",
    ".vscode",
    ".windsurf",
    ".roo",
    ".roorules",
    ".cline",
    ".clinerules",
    ".kilocode",
    ".kilocoderules",
    ".opencode",
    "opencode.json",
    "AGENT.md",
    ".roomodes",
];

/// Scan the home directory for workspaces with AI CLI configs
pub fn discover_workspaces(max_depth: u32) -> Result<DiscoveryResult, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let start = std::time::Instant::now();

    let prune_set: HashSet<&str> = PRUNE_DIRS.iter().copied().collect();
    let signal_set: HashSet<&str> = SIGNAL_NAMES.iter().copied().collect();

    // Map: workspace_root -> signals found
    let mut workspace_map: HashMap<PathBuf, WorkspaceSignals> = HashMap::new();

    let walker = WalkDir::new(&home_dir)
        .max_depth(max_depth as usize)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_str().unwrap_or("");
            // Don't descend into pruned dirs (but still yield the entry itself for signal checking)
            if entry.depth() > 0 && prune_set.contains(name) {
                return false;
            }
            true
        });

    for entry in walker.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_str().unwrap_or("");

        // Skip home-level dirs themselves (.claude, .codex, .gemini at ~/ are user-level, not workspaces)
        if entry.depth() <= 1 {
            continue;
        }

        if !signal_set.contains(name) {
            continue;
        }

        // The workspace root is the parent of this signal file/dir
        let signal_path = entry.path();
        let workspace_root = match signal_path.parent() {
            Some(p) => p.to_path_buf(),
            None => continue,
        };

        // Skip if the workspace root IS the home directory
        if workspace_root == home_dir {
            continue;
        }

        let signals = workspace_map.entry(workspace_root).or_default();

        match name {
            ".claude" if signal_path.is_dir() => {
                signals.has_claude_config = true;
                if signal_path.join("CLAUDE.md").exists() {
                    signals.has_claude_prompt = true;
                }
                if signal_path.join("skills").is_dir() {
                    signals.has_claude_skills = true;
                }
            }
            ".codex" if signal_path.is_dir() => {
                signals.has_codex_config = true;
                if signal_path.join("skills").is_dir() {
                    signals.has_codex_skills = true;
                }
            }
            ".gemini" if signal_path.is_dir() => {
                signals.has_gemini_config = true;
                if signal_path.join("GEMINI.md").exists() {
                    signals.has_gemini_prompt = true;
                }
                if signal_path.join("skills").is_dir() {
                    signals.has_gemini_skills = true;
                }
            }
            ".agents" if signal_path.is_dir() => {
                if signal_path.join("skills").is_dir() {
                    signals.has_codex_skills = true;
                }
            }
            ".mcp.json" if signal_path.is_file() => {
                signals.has_mcp_json = true;
                signals.has_claude_config = true;
            }
            "CLAUDE.md" if signal_path.is_file() => {
                signals.has_claude_prompt = true;
                signals.has_claude_config = true;
            }
            "AGENTS.md" if signal_path.is_file() => {
                signals.has_codex_prompt = true;
                signals.has_codex_config = true;
            }
            "GEMINI.md" if signal_path.is_file() => {
                signals.has_gemini_prompt = true;
                signals.has_gemini_config = true;
            }
            // New tools — check granular signals (rules, MCPs) inside each dir
            ".cursor" if signal_path.is_dir() => {
                signals.has_cursor_config = true;
                if signal_path.join("rules").is_dir() {
                    signals.has_cursor_rules = true;
                }
                if signal_path.join("mcp.json").exists() {
                    signals.has_cursor_mcps = true;
                }
            }
            ".github" if signal_path.is_dir() => {
                // Copilot rules: instructions files
                if signal_path.join("copilot-instructions.md").exists()
                    || signal_path.join("instructions").is_dir()
                {
                    signals.has_copilot_config = true;
                    signals.has_copilot_rules = true;
                }
                if signal_path.join("skills").is_dir() || signal_path.join("hooks").is_dir() {
                    signals.has_copilot_config = true;
                }
            }
            ".vscode" if signal_path.is_dir() => {
                // Copilot MCP config
                if signal_path.join("mcp.json").exists() {
                    signals.has_copilot_config = true;
                }
            }
            ".windsurf" if signal_path.is_dir() => {
                signals.has_windsurf_config = true;
                if signal_path.join("rules").is_dir() {
                    signals.has_windsurf_rules = true;
                }
            }
            ".roo" if signal_path.is_dir() => {
                signals.has_roo_config = true;
                if signal_path.join("rules").is_dir() {
                    signals.has_roo_rules = true;
                }
            }
            ".roorules" => {
                signals.has_roo_config = true;
                signals.has_roo_rules = true;
            }
            ".roomodes" => {
                signals.has_roo_config = true;
            }
            ".cline" if signal_path.is_dir() => {
                signals.has_cline_config = true;
                if signal_path.join("rules").is_dir() {
                    signals.has_cline_rules = true;
                }
            }
            ".clinerules" => {
                signals.has_cline_config = true;
                signals.has_cline_rules = true;
            }
            ".kilocode" if signal_path.is_dir() => {
                signals.has_kilo_config = true;
                if signal_path.join("rules").is_dir() {
                    signals.has_kilo_rules = true;
                }
            }
            ".kilocoderules" => {
                signals.has_kilo_config = true;
                signals.has_kilo_rules = true;
            }
            ".opencode" if signal_path.is_dir() => {
                signals.has_open_code_config = true;
            }
            "opencode.json" if signal_path.is_file() => {
                signals.has_open_code_config = true;
            }
            "AGENT.md" if signal_path.is_file() => {
                signals.has_open_code_config = true;
                signals.has_open_code_rules = true;
            }
            _ => {}
        }
    }

    // Convert to sorted list
    let mut workspaces: Vec<DiscoveredWorkspace> = workspace_map
        .into_iter()
        .filter_map(|(path, signals)| {
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            let is_git_repo = path.join(".git").exists();
            let tool_count = signals.tool_count();
            if tool_count == 0 {
                return None;
            }

            Some(DiscoveredWorkspace {
                path: path.to_string_lossy().to_string(),
                name,
                is_git_repo,
                signals,
                tool_count,
            })
        })
        .collect();

    // Sort: most tools first, then alphabetically
    workspaces.sort_by(|a, b| {
        b.tool_count
            .cmp(&a.tool_count)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let duration = start.elapsed();

    Ok(DiscoveryResult {
        workspaces,
        scan_depth: max_depth,
        scan_duration_ms: duration.as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Mutex, OnceLock};
    use tempfile::TempDir;

    fn with_loadout_home<T>(home: &std::path::Path, f: impl FnOnce() -> T) -> T {
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
    fn test_workspace_signals_tool_count() {
        let mut signals = WorkspaceSignals::default();
        assert_eq!(signals.tool_count(), 0);

        signals.has_claude_config = true;
        assert_eq!(signals.tool_count(), 1);

        signals.has_codex_prompt = true;
        assert_eq!(signals.tool_count(), 2);

        signals.has_gemini_skills = true;
        assert_eq!(signals.tool_count(), 3);
    }

    #[test]
    fn test_prune_dirs_are_skipped() {
        // Ensure node_modules is in the prune set
        let prune_set: HashSet<&str> = PRUNE_DIRS.iter().copied().collect();
        assert!(prune_set.contains("node_modules"));
        assert!(prune_set.contains(".git"));
        assert!(prune_set.contains("Library"));
    }

    #[test]
    fn test_signal_names_present() {
        let signal_set: HashSet<&str> = SIGNAL_NAMES.iter().copied().collect();
        assert!(signal_set.contains(".claude"));
        assert!(signal_set.contains(".mcp.json"));
        assert!(signal_set.contains("CLAUDE.md"));
        assert!(signal_set.contains("AGENTS.md"));
    }

    #[test]
    fn test_discovered_workspace_serialization() {
        let ws = DiscoveredWorkspace {
            path: "/test/project".to_string(),
            name: "project".to_string(),
            is_git_repo: true,
            signals: WorkspaceSignals {
                has_claude_config: true,
                has_mcp_json: true,
                ..Default::default()
            },
            tool_count: 1,
        };

        let json = serde_json::to_string(&ws).unwrap();
        assert!(json.contains("\"isGitRepo\":true"));
        assert!(json.contains("\"toolCount\":1"));
        assert!(json.contains("\"hasClaudeConfig\":true"));
    }

    #[test]
    fn test_discovery_skips_workspace_without_effective_signals() {
        let home = TempDir::new().unwrap();
        let projects = home.path().join("projects");
        let no_signal = projects.join("plain-github");
        let copilot = projects.join("copilot-project");

        fs::create_dir_all(no_signal.join(".github")).unwrap();
        fs::create_dir_all(copilot.join(".github").join("instructions")).unwrap();

        let result = with_loadout_home(home.path(), || discover_workspaces(6)).unwrap();
        let names: Vec<String> = result.workspaces.iter().map(|w| w.name.clone()).collect();

        assert!(!names.contains(&"plain-github".to_string()));
        assert!(names.contains(&"copilot-project".to_string()));
        assert!(result.workspaces.iter().all(|w| w.tool_count > 0));
    }
}
