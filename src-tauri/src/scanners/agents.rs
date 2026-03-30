//! Agents scanner for Claude Code and Gemini CLI
//!
//! Scans all agent paths and returns a unified list with maturity badges,
//! conflict detection, shadowing information, and configuredIn merging.

use crate::parsers::parse_agent_md;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

/// Source tool for an agent (only Claude and Gemini support agents)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum AgentSourceTool {
    Claude,
    Gemini,
}

/// Scope of an agent (user-level or project-level)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum AgentScope {
    User,
    Project,
}

/// Maturity level of an agent feature
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AgentMaturity {
    Stable,
    Experimental,
}

/// Normalized agent item for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentItem {
    /// Unique identifier (hash of name + source + scope)
    pub id: String,
    /// Agent name from frontmatter or filename
    pub name: String,
    /// Agent description
    pub description: String,
    /// Full markdown content (body after frontmatter)
    pub content: String,
    /// Allowed tools (comma-separated in frontmatter)
    pub tools: Option<String>,
    /// Model override
    pub model: Option<String>,
    /// Max agentic turns
    pub max_turns: Option<u32>,
    /// Permission mode
    pub permission_mode: Option<String>,
    /// Which tool this agent is from
    pub source_tool: AgentSourceTool,
    /// Scope level (user or project)
    pub scope: AgentScope,
    /// Feature maturity (stable or experimental)
    pub maturity: AgentMaturity,
    /// Absolute path to the agent .md file
    pub path: String,
    /// True if this agent is shadowed by a higher-precedence agent
    pub is_shadowed: bool,
    /// Path of the agent that shadows this one
    pub shadowed_by: Option<String>,
    /// Which tools this agent is configured in (for merged view)
    pub configured_in: Vec<AgentSourceTool>,
}

/// Conflict information when same agent name has different content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConflict {
    /// Agent name that has conflicts
    pub name: String,
    /// Paths of agents with different content
    pub conflicting_paths: Vec<String>,
    /// Tools that have this conflict
    pub tools: Vec<AgentSourceTool>,
}

/// Result of scanning all agents
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentScanResult {
    /// All discovered agents
    pub agents: Vec<AgentItem>,
    /// Detected conflicts (same name, different content)
    pub conflicts: Vec<AgentConflict>,
    /// Whether Gemini has enableAgents: true in settings
    pub gemini_agents_enabled: bool,
}

/// Internal struct for tracking agent during scanning
#[derive(Debug, Clone)]
struct RawAgentEntry {
    name: String,
    description: String,
    content: String,
    content_hash: u64,
    tools: Option<String>,
    model: Option<String>,
    max_turns: Option<u32>,
    permission_mode: Option<String>,
    source_tool: AgentSourceTool,
    scope: AgentScope,
    path: String,
}

/// Scan all agents across Claude Code and Gemini CLI
pub fn scan_all_agents(workspace_path: Option<&str>) -> Result<AgentScanResult, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let mut entries: Vec<RawAgentEntry> = Vec::new();

    // Scan Claude Code agents
    // User-level: ~/.claude/agents/*.md
    let claude_user_path = home_dir.join(".claude").join("agents");
    scan_agent_directory(
        &claude_user_path,
        AgentSourceTool::Claude,
        AgentScope::User,
        &mut entries,
    );

    // Project-level: $PROJECT_ROOT/.claude/agents/*.md
    if let Some(ws_path) = workspace_path {
        let claude_project_path = PathBuf::from(ws_path).join(".claude").join("agents");
        scan_agent_directory(
            &claude_project_path,
            AgentSourceTool::Claude,
            AgentScope::Project,
            &mut entries,
        );
    }

    // Scan Gemini CLI agents
    // User-level: ~/.gemini/agents/*.md
    let gemini_user_path = home_dir.join(".gemini").join("agents");
    scan_agent_directory(
        &gemini_user_path,
        AgentSourceTool::Gemini,
        AgentScope::User,
        &mut entries,
    );

    // Project-level: $PROJECT_ROOT/.gemini/agents/*.md
    if let Some(ws_path) = workspace_path {
        let gemini_project_path = PathBuf::from(ws_path).join(".gemini").join("agents");
        scan_agent_directory(
            &gemini_project_path,
            AgentSourceTool::Gemini,
            AgentScope::Project,
            &mut entries,
        );
    }

    // Check Gemini enableAgents setting
    let gemini_agents_enabled = check_gemini_agents_enabled(&home_dir);

    // Process entries: detect conflicts, shadowing, and merge configuredIn
    let (agents, conflicts) = process_agent_entries(entries);

    Ok(AgentScanResult {
        agents,
        conflicts,
        gemini_agents_enabled,
    })
}

/// Scan a directory for agent .md files (flat directory, not nested)
fn scan_agent_directory(
    base_path: &PathBuf,
    source_tool: AgentSourceTool,
    scope: AgentScope,
    entries: &mut Vec<RawAgentEntry>,
) {
    if !base_path.exists() {
        return;
    }

    let dir_entries = match std::fs::read_dir(base_path) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for dir_entry in dir_entries.filter_map(|e| e.ok()) {
        let path = dir_entry.path();

        // Only process .md files
        if path.extension().map(|ext| ext == "md").unwrap_or(false) {
            if let Ok(agent) = parse_agent_md(&path) {
                let content_hash = hash_content(&agent.content);
                entries.push(RawAgentEntry {
                    name: agent.name,
                    description: agent.description,
                    content: agent.content,
                    content_hash,
                    tools: agent.tools,
                    model: agent.model,
                    max_turns: agent.max_turns,
                    permission_mode: agent.permission_mode,
                    source_tool,
                    scope,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
}

/// Check if Gemini has enableAgents: true in settings.json
fn check_gemini_agents_enabled(home_dir: &Path) -> bool {
    let settings_path = home_dir.join(".gemini").join("settings.json");
    if let Ok(content) = std::fs::read_to_string(&settings_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            return json
                .get("enableAgents")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
        }
    }
    false
}

/// Hash content for comparison
fn hash_content(content: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    hasher.finish()
}

/// Generate a unique ID for an agent
fn generate_agent_id(name: &str, source_tool: AgentSourceTool, scope: AgentScope) -> String {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    format!("{:?}", source_tool).hash(&mut hasher);
    format!("{:?}", scope).hash(&mut hasher);
    format!("agent_{:x}", hasher.finish())
}

/// Process entries to detect conflicts, shadowing, and merge configuredIn
fn process_agent_entries(
    entries: Vec<RawAgentEntry>,
) -> (Vec<AgentItem>, Vec<AgentConflict>) {
    let mut agents: Vec<AgentItem> = Vec::new();
    let mut conflicts: Vec<AgentConflict> = Vec::new();

    // Group by name to detect conflicts and shadowing
    let mut by_name: HashMap<String, Vec<&RawAgentEntry>> = HashMap::new();
    for entry in &entries {
        by_name.entry(entry.name.clone()).or_default().push(entry);
    }

    // Track which agents shadow others (within same tool)
    // Key: (name, tool) -> shadowing path
    let mut shadow_map: HashMap<(String, AgentSourceTool), String> = HashMap::new();

    // First pass: determine shadowing within same tool
    for (name, group) in &by_name {
        for tool in [AgentSourceTool::Claude, AgentSourceTool::Gemini] {
            let tool_agents: Vec<_> = group.iter().filter(|e| e.source_tool == tool).collect();

            // If both project and user exist for same tool, project shadows user
            let project_agent = tool_agents
                .iter()
                .find(|e| e.scope == AgentScope::Project);
            let user_agent = tool_agents.iter().find(|e| e.scope == AgentScope::User);

            if let (Some(proj), Some(_user)) = (project_agent, user_agent) {
                shadow_map.insert((name.clone(), tool), proj.path.clone());
            }
        }
    }

    // Second pass: detect conflicts (same name+scope, different content across tools)
    // Group by (name, scope) so that user/project shadowing is not flagged as a conflict.
    let mut by_name_scope: HashMap<(String, AgentScope), Vec<&RawAgentEntry>> = HashMap::new();
    for entry in &entries {
        by_name_scope
            .entry((entry.name.clone(), entry.scope))
            .or_default()
            .push(entry);
    }

    for ((name, _scope), group) in &by_name_scope {
        // Only flag conflicts when there are multiple tools with different content
        let unique_tools: std::collections::HashSet<AgentSourceTool> =
            group.iter().map(|e| e.source_tool).collect();
        if unique_tools.len() < 2 {
            continue; // Same tool entries — shadowing, not conflict
        }

        let unique_hashes: std::collections::HashSet<u64> =
            group.iter().map(|e| e.content_hash).collect();

        if unique_hashes.len() > 1 {
            let conflicting_paths: Vec<String> = group.iter().map(|e| e.path.clone()).collect();
            let tools: Vec<AgentSourceTool> = unique_tools.into_iter().collect();

            conflicts.push(AgentConflict {
                name: name.clone(),
                conflicting_paths,
                tools,
            });
        }
    }

    // Track which tools each agent name+scope is configured in
    let mut configured_in_map: HashMap<(String, AgentScope), Vec<AgentSourceTool>> = HashMap::new();
    for entry in &entries {
        let key = (entry.name.clone(), entry.scope);
        let tools = configured_in_map.entry(key).or_default();
        if !tools.contains(&entry.source_tool) {
            tools.push(entry.source_tool);
        }
    }

    // Third pass: build final agent items
    for entry in entries {
        let maturity = match entry.source_tool {
            AgentSourceTool::Claude => AgentMaturity::Stable,
            AgentSourceTool::Gemini => AgentMaturity::Experimental,
        };

        // Check if this agent is shadowed
        let shadow_key = (entry.name.clone(), entry.source_tool);
        let is_shadowed = if let Some(shadowing_path) = shadow_map.get(&shadow_key) {
            entry.scope == AgentScope::User && shadowing_path != &entry.path
        } else {
            false
        };
        let shadowed_by = if is_shadowed {
            shadow_map.get(&shadow_key).cloned()
        } else {
            None
        };

        let id = generate_agent_id(&entry.name, entry.source_tool, entry.scope);

        let configured_in = configured_in_map
            .get(&(entry.name.clone(), entry.scope))
            .cloned()
            .unwrap_or_default();

        agents.push(AgentItem {
            id,
            name: entry.name,
            description: entry.description,
            content: entry.content,
            tools: entry.tools,
            model: entry.model,
            max_turns: entry.max_turns,
            permission_mode: entry.permission_mode,
            source_tool: entry.source_tool,
            scope: entry.scope,
            maturity,
            path: entry.path,
            is_shadowed,
            shadowed_by,
            configured_in,
        });
    }

    // Sort by name, then by scope (project first), then by tool
    agents.sort_by(|a, b| {
        a.name
            .cmp(&b.name)
            .then_with(|| match (&a.scope, &b.scope) {
                (AgentScope::Project, AgentScope::User) => std::cmp::Ordering::Less,
                (AgentScope::User, AgentScope::Project) => std::cmp::Ordering::Greater,
                _ => std::cmp::Ordering::Equal,
            })
            .then_with(|| {
                format!("{:?}", a.source_tool).cmp(&format!("{:?}", b.source_tool))
            })
    });

    (agents, conflicts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_agent_id() {
        let id1 = generate_agent_id("test", AgentSourceTool::Claude, AgentScope::User);
        let id2 = generate_agent_id("test", AgentSourceTool::Claude, AgentScope::User);
        let id3 = generate_agent_id("test", AgentSourceTool::Gemini, AgentScope::User);

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
        assert!(id1.starts_with("agent_"));
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
            RawAgentEntry {
                name: "test".to_string(),
                description: "Test".to_string(),
                content: "content".to_string(),
                content_hash: 12345,
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::User,
                path: "/test/path".to_string(),
            },
            RawAgentEntry {
                name: "test2".to_string(),
                description: "Test2".to_string(),
                content: "content".to_string(),
                content_hash: 12345,
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Gemini,
                scope: AgentScope::User,
                path: "/test/path2".to_string(),
            },
        ];

        let (agents, _) = process_agent_entries(entries);

        let claude_agent = agents
            .iter()
            .find(|a| a.source_tool == AgentSourceTool::Claude)
            .unwrap();
        let gemini_agent = agents
            .iter()
            .find(|a| a.source_tool == AgentSourceTool::Gemini)
            .unwrap();

        assert_eq!(claude_agent.maturity, AgentMaturity::Stable);
        assert_eq!(gemini_agent.maturity, AgentMaturity::Experimental);
    }

    #[test]
    fn test_conflict_detection() {
        let entries = vec![
            RawAgentEntry {
                name: "shared".to_string(),
                description: "Test".to_string(),
                content: "content version 1".to_string(),
                content_hash: hash_content("content version 1"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::User,
                path: "/claude/path".to_string(),
            },
            RawAgentEntry {
                name: "shared".to_string(),
                description: "Test".to_string(),
                content: "content version 2".to_string(),
                content_hash: hash_content("content version 2"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Gemini,
                scope: AgentScope::User,
                path: "/gemini/path".to_string(),
            },
        ];

        let (_, conflicts) = process_agent_entries(entries);

        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].name, "shared");
        assert_eq!(conflicts[0].conflicting_paths.len(), 2);
    }

    #[test]
    fn test_shadowing_detection() {
        let entries = vec![
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "Project version".to_string(),
                content: "project content".to_string(),
                content_hash: 111,
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::Project,
                path: "/project/.claude/agents/reviewer.md".to_string(),
            },
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "User version".to_string(),
                content: "user content".to_string(),
                content_hash: 222,
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::User,
                path: "/home/.claude/agents/reviewer.md".to_string(),
            },
        ];

        let (agents, _) = process_agent_entries(entries);

        let project_agent = agents
            .iter()
            .find(|a| a.scope == AgentScope::Project)
            .unwrap();
        let user_agent = agents
            .iter()
            .find(|a| a.scope == AgentScope::User)
            .unwrap();

        assert!(!project_agent.is_shadowed);
        assert!(user_agent.is_shadowed);
        assert!(user_agent.shadowed_by.is_some());
    }

    #[test]
    fn test_configured_in_merging() {
        let entries = vec![
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "Reviews code".to_string(),
                content: "same content".to_string(),
                content_hash: hash_content("same content"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::User,
                path: "/home/.claude/agents/reviewer.md".to_string(),
            },
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "Reviews code".to_string(),
                content: "same content".to_string(),
                content_hash: hash_content("same content"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Gemini,
                scope: AgentScope::User,
                path: "/home/.gemini/agents/reviewer.md".to_string(),
            },
        ];

        let (agents, _) = process_agent_entries(entries);

        // Both agents should have configuredIn containing both tools
        for agent in &agents {
            assert_eq!(agent.configured_in.len(), 2);
            assert!(agent.configured_in.contains(&AgentSourceTool::Claude));
            assert!(agent.configured_in.contains(&AgentSourceTool::Gemini));
        }
    }

    #[test]
    fn test_shadowing_not_flagged_as_conflict() {
        // Same name, same tool, different scopes (user vs project) = shadowing, NOT conflict
        let entries = vec![
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "Project version".to_string(),
                content: "project content".to_string(),
                content_hash: hash_content("project content"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::Project,
                path: "/project/.claude/agents/reviewer.md".to_string(),
            },
            RawAgentEntry {
                name: "reviewer".to_string(),
                description: "User version".to_string(),
                content: "user content".to_string(),
                content_hash: hash_content("user content"),
                tools: None,
                model: None,
                max_turns: None,
                permission_mode: None,
                source_tool: AgentSourceTool::Claude,
                scope: AgentScope::User,
                path: "/home/.claude/agents/reviewer.md".to_string(),
            },
        ];

        let (_, conflicts) = process_agent_entries(entries);

        // Should NOT flag as conflict — same tool, different scopes is shadowing
        assert_eq!(conflicts.len(), 0);
    }
}
