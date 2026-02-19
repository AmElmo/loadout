//! Skills scanner for Claude Code, Codex CLI, and Gemini CLI
//!
//! Scans all skill paths and returns a unified list with maturity badges,
//! conflict detection, and shadowing information.

use super::tokens::estimate_tokens;
use crate::parsers::parse_skill_md;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use walkdir::WalkDir;

/// Source tool for a skill
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum SkillSourceTool {
    Claude,
    Codex,
    Gemini,
    Cursor,
    Copilot,
    Windsurf,
    Roo,
    Cline,
    Kilo,
    OpenCode,
}

/// Scope of a skill (user-level or project-level)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SkillScope {
    User,
    Project,
}

/// Maturity level of a skill feature
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SkillMaturity {
    Stable,
    Experimental,
}

/// Normalized skill item for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillItem {
    /// Unique identifier (hash of name + source + scope)
    pub id: String,
    /// Skill name from frontmatter
    pub name: String,
    /// Skill description from frontmatter
    pub description: String,
    /// Full markdown content
    pub content: String,
    /// Which tool this skill is from
    pub source_tool: SkillSourceTool,
    /// Scope level (user or project)
    pub scope: SkillScope,
    /// Feature maturity (stable or experimental)
    pub maturity: SkillMaturity,
    /// Absolute path to the SKILL.md file
    pub path: String,
    /// Estimated tokens when idle (just name + description in skill listing)
    pub idle_tokens: u32,
    /// Estimated tokens when actively invoked (full content)
    pub active_tokens: u32,
    /// True if this skill is shadowed by a higher-precedence skill
    pub is_shadowed: bool,
    /// Path of the skill that shadows this one
    pub shadowed_by: Option<String>,
}

/// Conflict information when same skill name has different content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConflict {
    /// Skill name that has conflicts
    pub name: String,
    /// Paths of skills with different content
    pub conflicting_paths: Vec<String>,
    /// Tools that have this conflict
    pub tools: Vec<SkillSourceTool>,
}

/// Result of scanning all skills
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanResult {
    /// All discovered skills
    pub skills: Vec<SkillItem>,
    /// Detected conflicts (same name, different content)
    pub conflicts: Vec<SkillConflict>,
}

/// Internal struct for tracking skill during scanning
#[derive(Debug, Clone)]
struct RawSkillEntry {
    name: String,
    description: String,
    content: String,
    content_hash: u64,
    source_tool: SkillSourceTool,
    scope: SkillScope,
    path: String,
}

/// Scan all skills across all tools
pub fn scan_all_skills(workspace_path: Option<&str>) -> Result<SkillScanResult, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let mut entries: Vec<RawSkillEntry> = Vec::new();

    // Scan Claude Code skills
    // User-level: ~/.claude/skills/<name>/SKILL.md
    let claude_user_path = home_dir.join(".claude").join("skills");
    scan_skill_directory(&claude_user_path, SkillSourceTool::Claude, SkillScope::User, &mut entries);

    // Project-level: $PROJECT_ROOT/.claude/skills/<name>/SKILL.md
    if let Some(ws_path) = workspace_path {
        let claude_project_path = PathBuf::from(ws_path).join(".claude").join("skills");
        scan_skill_directory(&claude_project_path, SkillSourceTool::Claude, SkillScope::Project, &mut entries);
    }

    // Scan Claude Code legacy commands (merged with skills)
    // User-level: ~/.claude/commands/<name>.md
    let claude_user_commands = home_dir.join(".claude").join("commands");
    scan_command_directory(&claude_user_commands, SkillSourceTool::Claude, SkillScope::User, &mut entries);

    // Project-level: $PROJECT_ROOT/.claude/commands/<name>.md
    if let Some(ws_path) = workspace_path {
        let claude_project_commands = PathBuf::from(ws_path).join(".claude").join("commands");
        scan_command_directory(&claude_project_commands, SkillSourceTool::Claude, SkillScope::Project, &mut entries);
    }

    // Scan Codex CLI skills
    // User-level: $HOME/.agents/skills/<name>/SKILL.md
    let codex_user_path = home_dir.join(".agents").join("skills");
    scan_skill_directory(&codex_user_path, SkillSourceTool::Codex, SkillScope::User, &mut entries);

    // Project-level: $PROJECT_ROOT/.codex/skills/<name>/SKILL.md
    if let Some(ws_path) = workspace_path {
        let codex_project_path = PathBuf::from(ws_path).join(".codex").join("skills");
        scan_skill_directory(&codex_project_path, SkillSourceTool::Codex, SkillScope::Project, &mut entries);
    }

    // Scan Gemini CLI skills
    // User-level: ~/.gemini/skills/<name>/SKILL.md
    let gemini_user_path = home_dir.join(".gemini").join("skills");
    scan_skill_directory(&gemini_user_path, SkillSourceTool::Gemini, SkillScope::User, &mut entries);

    // Project-level: $PROJECT_ROOT/.gemini/skills/<name>/SKILL.md
    if let Some(ws_path) = workspace_path {
        let gemini_project_path = PathBuf::from(ws_path).join(".gemini").join("skills");
        scan_skill_directory(&gemini_project_path, SkillSourceTool::Gemini, SkillScope::Project, &mut entries);
    }

    // === Cursor Skills ===
    scan_skill_directory(&home_dir.join(".cursor").join("skills"), SkillSourceTool::Cursor, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        scan_skill_directory(&PathBuf::from(ws_path).join(".cursor").join("skills"), SkillSourceTool::Cursor, SkillScope::Project, &mut entries);
    }

    // === Copilot Skills ===
    scan_skill_directory(&home_dir.join(".copilot").join("skills"), SkillSourceTool::Copilot, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        let ws = PathBuf::from(ws_path);
        scan_skill_directory(&ws.join(".github").join("skills"), SkillSourceTool::Copilot, SkillScope::Project, &mut entries);
    }

    // === Windsurf Skills ===
    scan_skill_directory(&home_dir.join(".codeium").join("windsurf").join("skills"), SkillSourceTool::Windsurf, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        scan_skill_directory(&PathBuf::from(ws_path).join(".windsurf").join("skills"), SkillSourceTool::Windsurf, SkillScope::Project, &mut entries);
    }

    // === Roo Skills ===
    scan_skill_directory(&home_dir.join(".roo").join("skills"), SkillSourceTool::Roo, SkillScope::User, &mut entries);
    // Roo also supports ~/.agents/skills (shared path — attributed to Roo as well)
    scan_skill_directory(&home_dir.join(".agents").join("skills"), SkillSourceTool::Roo, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        let ws = PathBuf::from(ws_path);
        scan_skill_directory(&ws.join(".roo").join("skills"), SkillSourceTool::Roo, SkillScope::Project, &mut entries);
        scan_skill_directory(&ws.join(".agents").join("skills"), SkillSourceTool::Roo, SkillScope::Project, &mut entries);
    }

    // === Cline Skills ===
    scan_skill_directory(&home_dir.join(".cline").join("skills"), SkillSourceTool::Cline, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        scan_skill_directory(&PathBuf::from(ws_path).join(".cline").join("skills"), SkillSourceTool::Cline, SkillScope::Project, &mut entries);
    }

    // === Kilo Skills ===
    scan_skill_directory(&home_dir.join(".kilocode").join("skills"), SkillSourceTool::Kilo, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        scan_skill_directory(&PathBuf::from(ws_path).join(".kilocode").join("skills"), SkillSourceTool::Kilo, SkillScope::Project, &mut entries);
    }

    // === OpenCode Skills ===
    scan_skill_directory(&home_dir.join(".config").join("opencode").join("skills"), SkillSourceTool::OpenCode, SkillScope::User, &mut entries);
    // OpenCode compatibility paths
    scan_skill_directory(&home_dir.join(".claude").join("skills"), SkillSourceTool::OpenCode, SkillScope::User, &mut entries);
    scan_skill_directory(&home_dir.join(".agents").join("skills"), SkillSourceTool::OpenCode, SkillScope::User, &mut entries);
    if let Some(ws_path) = workspace_path {
        let ws = PathBuf::from(ws_path);
        scan_skill_directory(&ws.join(".opencode").join("skills"), SkillSourceTool::OpenCode, SkillScope::Project, &mut entries);
    }

    // Process entries: detect conflicts and shadowing
    let (skills, conflicts) = process_skill_entries(entries);

    Ok(SkillScanResult { skills, conflicts })
}

/// Scan a directory for SKILL.md files
fn scan_skill_directory(
    base_path: &PathBuf,
    source_tool: SkillSourceTool,
    scope: SkillScope,
    entries: &mut Vec<RawSkillEntry>,
) {
    if !base_path.exists() {
        return;
    }

    // Walk the directory looking for SKILL.md files
    for entry in WalkDir::new(base_path)
        .min_depth(2)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
            if let Ok(skill) = parse_skill_md(path) {
                let content_hash = hash_content(&skill.content);
                entries.push(RawSkillEntry {
                    name: skill.name,
                    description: skill.description,
                    content: skill.content,
                    content_hash,
                    source_tool,
                    scope,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
}

/// Scan a directory for legacy command .md files (Claude Code only)
/// Commands are plain .md files at depth 1: commands/review.md → name "review"
fn scan_command_directory(
    base_path: &PathBuf,
    source_tool: SkillSourceTool,
    scope: SkillScope,
    entries: &mut Vec<RawSkillEntry>,
) {
    if !base_path.exists() {
        return;
    }

    // Walk the directory looking for .md files at depth 1
    for entry in WalkDir::new(base_path)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().map(|ext| ext == "md").unwrap_or(false) {
            // Derive name from filename (e.g., "review.md" → "review")
            let fallback_name = path
                .file_stem()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());

            if let Ok(content) = std::fs::read_to_string(path) {
                if let Ok(skill) = crate::parsers::parse_skill_content(&content, &fallback_name) {
                    let content_hash = hash_content(&skill.content);
                    entries.push(RawSkillEntry {
                        name: skill.name,
                        description: skill.description,
                        content: skill.content,
                        content_hash,
                        source_tool,
                        scope,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
}

/// Hash content for comparison
fn hash_content(content: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    hasher.finish()
}

/// Generate a unique ID for a skill
fn generate_skill_id(name: &str, source_tool: SkillSourceTool, scope: SkillScope) -> String {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    format!("{:?}", source_tool).hash(&mut hasher);
    format!("{:?}", scope).hash(&mut hasher);
    format!("skill_{:x}", hasher.finish())
}

/// Process entries to detect conflicts and shadowing
fn process_skill_entries(entries: Vec<RawSkillEntry>) -> (Vec<SkillItem>, Vec<SkillConflict>) {
    let mut skills: Vec<SkillItem> = Vec::new();
    let mut conflicts: Vec<SkillConflict> = Vec::new();

    // Group by name to detect conflicts and shadowing
    let mut by_name: HashMap<String, Vec<&RawSkillEntry>> = HashMap::new();
    for entry in &entries {
        by_name.entry(entry.name.clone()).or_default().push(entry);
    }

    // Track which skills shadow others (within same tool)
    // For Codex: project > user
    // Key: (name, tool) -> shadowing path
    let mut shadow_map: HashMap<(String, SkillSourceTool), String> = HashMap::new();

    // First pass: determine shadowing within same tool
    for (name, group) in &by_name {
        for tool in [
            SkillSourceTool::Claude, SkillSourceTool::Codex, SkillSourceTool::Gemini,
            SkillSourceTool::Cursor, SkillSourceTool::Copilot, SkillSourceTool::Windsurf,
            SkillSourceTool::Roo, SkillSourceTool::Cline, SkillSourceTool::Kilo, SkillSourceTool::OpenCode,
        ] {
            let tool_skills: Vec<_> = group.iter().filter(|e| e.source_tool == tool).collect();

            // If both project and user exist for same tool, project shadows user
            let project_skill = tool_skills.iter().find(|e| e.scope == SkillScope::Project);
            let user_skill = tool_skills.iter().find(|e| e.scope == SkillScope::User);

            if let (Some(proj), Some(_user)) = (project_skill, user_skill) {
                shadow_map.insert((name.clone(), tool), proj.path.clone());
            }
        }
    }

    // Second pass: detect conflicts (same name, different content across tools)
    for (name, group) in &by_name {
        // Check if there are different content hashes
        let unique_hashes: std::collections::HashSet<u64> = group.iter().map(|e| e.content_hash).collect();

        if unique_hashes.len() > 1 {
            // There's a conflict - different content for same skill name
            let conflicting_paths: Vec<String> = group.iter().map(|e| e.path.clone()).collect();
            let tools: Vec<SkillSourceTool> = group.iter().map(|e| e.source_tool).collect::<std::collections::HashSet<_>>().into_iter().collect();

            conflicts.push(SkillConflict {
                name: name.clone(),
                conflicting_paths,
                tools,
            });
        }
    }

    // Third pass: build final skill items
    for entry in entries {
        let maturity = match entry.source_tool {
            SkillSourceTool::Claude | SkillSourceTool::Codex => SkillMaturity::Stable,
            SkillSourceTool::Gemini => SkillMaturity::Experimental,
            SkillSourceTool::Cursor => SkillMaturity::Experimental,
            SkillSourceTool::Copilot | SkillSourceTool::Windsurf | SkillSourceTool::Roo
            | SkillSourceTool::Cline | SkillSourceTool::Kilo | SkillSourceTool::OpenCode => SkillMaturity::Stable,
        };

        // Check if this skill is shadowed
        let shadow_key = (entry.name.clone(), entry.source_tool);
        let is_shadowed = if let Some(shadowing_path) = shadow_map.get(&shadow_key) {
            // This skill is shadowed if it's a user skill and there's a project skill
            entry.scope == SkillScope::User && shadowing_path != &entry.path
        } else {
            false
        };
        let shadowed_by = if is_shadowed {
            shadow_map.get(&shadow_key).cloned()
        } else {
            None
        };

        let id = generate_skill_id(&entry.name, entry.source_tool, entry.scope);

        // Estimate tokens: idle = name + description (as listed in skill menu),
        // active = full content (loaded when skill is invoked)
        let idle_text = format!("{}: {}", &entry.name, &entry.description);
        let idle_tokens = estimate_tokens(&idle_text);
        let active_tokens = estimate_tokens(&entry.content);

        skills.push(SkillItem {
            id,
            name: entry.name,
            description: entry.description,
            content: entry.content,
            source_tool: entry.source_tool,
            scope: entry.scope,
            maturity,
            path: entry.path,
            idle_tokens,
            active_tokens,
            is_shadowed,
            shadowed_by,
        });
    }

    // Sort by name, then by scope (project first), then by tool
    skills.sort_by(|a, b| {
        a.name.cmp(&b.name)
            .then_with(|| {
                // Project skills first
                match (&a.scope, &b.scope) {
                    (SkillScope::Project, SkillScope::User) => std::cmp::Ordering::Less,
                    (SkillScope::User, SkillScope::Project) => std::cmp::Ordering::Greater,
                    _ => std::cmp::Ordering::Equal,
                }
            })
            .then_with(|| format!("{:?}", a.source_tool).cmp(&format!("{:?}", b.source_tool)))
    });

    (skills, conflicts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_skill_id() {
        let id1 = generate_skill_id("test", SkillSourceTool::Claude, SkillScope::User);
        let id2 = generate_skill_id("test", SkillSourceTool::Claude, SkillScope::User);
        let id3 = generate_skill_id("test", SkillSourceTool::Codex, SkillScope::User);

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
        assert!(id1.starts_with("skill_"));
    }

    #[test]
    fn test_hash_content() {
        let hash1 = hash_content("hello world");
        let hash2 = hash_content("hello world");
        let hash3 = hash_content("different content");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_maturity_by_tool() {
        let entries = vec![
            RawSkillEntry {
                name: "test".to_string(),
                description: "Test".to_string(),
                content: "content".to_string(),
                content_hash: 12345,
                source_tool: SkillSourceTool::Claude,
                scope: SkillScope::User,
                path: "/test/path".to_string(),
            },
            RawSkillEntry {
                name: "test2".to_string(),
                description: "Test2".to_string(),
                content: "content".to_string(),
                content_hash: 12345,
                source_tool: SkillSourceTool::Gemini,
                scope: SkillScope::User,
                path: "/test/path2".to_string(),
            },
        ];

        let (skills, _) = process_skill_entries(entries);

        let claude_skill = skills.iter().find(|s| s.source_tool == SkillSourceTool::Claude).unwrap();
        let gemini_skill = skills.iter().find(|s| s.source_tool == SkillSourceTool::Gemini).unwrap();

        assert_eq!(claude_skill.maturity, SkillMaturity::Stable);
        assert_eq!(gemini_skill.maturity, SkillMaturity::Experimental);
    }

    #[test]
    fn test_conflict_detection() {
        let entries = vec![
            RawSkillEntry {
                name: "shared".to_string(),
                description: "Test".to_string(),
                content: "content version 1".to_string(),
                content_hash: hash_content("content version 1"),
                source_tool: SkillSourceTool::Claude,
                scope: SkillScope::User,
                path: "/claude/path".to_string(),
            },
            RawSkillEntry {
                name: "shared".to_string(),
                description: "Test".to_string(),
                content: "content version 2".to_string(),
                content_hash: hash_content("content version 2"),
                source_tool: SkillSourceTool::Codex,
                scope: SkillScope::User,
                path: "/codex/path".to_string(),
            },
        ];

        let (_, conflicts) = process_skill_entries(entries);

        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].name, "shared");
        assert_eq!(conflicts[0].conflicting_paths.len(), 2);
    }

    #[test]
    fn test_shadowing_detection() {
        let entries = vec![
            RawSkillEntry {
                name: "myskill".to_string(),
                description: "Project version".to_string(),
                content: "project content".to_string(),
                content_hash: 111,
                source_tool: SkillSourceTool::Codex,
                scope: SkillScope::Project,
                path: "/project/.codex/skills/myskill/SKILL.md".to_string(),
            },
            RawSkillEntry {
                name: "myskill".to_string(),
                description: "User version".to_string(),
                content: "user content".to_string(),
                content_hash: 222,
                source_tool: SkillSourceTool::Codex,
                scope: SkillScope::User,
                path: "/home/.agents/skills/myskill/SKILL.md".to_string(),
            },
        ];

        let (skills, _) = process_skill_entries(entries);

        let project_skill = skills.iter().find(|s| s.scope == SkillScope::Project).unwrap();
        let user_skill = skills.iter().find(|s| s.scope == SkillScope::User).unwrap();

        assert!(!project_skill.is_shadowed);
        assert!(user_skill.is_shadowed);
        assert!(user_skill.shadowed_by.is_some());
    }
}
