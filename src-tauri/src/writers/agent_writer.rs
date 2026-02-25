//! Agent writer — installs agent .md files to the correct path per tool
//!
//! Agents are simple .md files (not nested in directories like skills).
//! Path pattern: `~/{tool_dir}/agents/{filename}.md`

use crate::writers::atomic::atomic_write;
use std::path::PathBuf;

/// Validate an agent filename before using it as a file name.
///
/// Only ASCII alphanumeric characters plus `.`, `_`, and `-` are allowed.
/// Path separators and traversal sequences are rejected.
pub fn validate_agent_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Agent name is required".to_string());
    }

    if trimmed == "." || trimmed == ".." {
        return Err("Agent name cannot be '.' or '..'".to_string());
    }

    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains('\0') {
        return Err("Agent name cannot contain path separators".to_string());
    }

    if !trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(
            "Agent name can only contain letters, numbers, hyphens, underscores, and dots"
                .to_string(),
        );
    }

    Ok(trimmed.to_string())
}

/// Get the agents directory path for a tool + scope
fn agents_dir_for_tool(
    tool: &str,
    scope: &str,
    workspace_path: Option<&str>,
) -> Result<PathBuf, String> {
    match scope {
        "user" => {
            let home =
                crate::helpers::effective_home().ok_or("Could not determine home directory")?;
            match tool {
                "claude" => Ok(home.join(".claude").join("agents")),
                "gemini" => Ok(home.join(".gemini").join("agents")),
                _ => Err(format!(
                    "Tool '{}' does not support agents",
                    tool
                )),
            }
        }
        "project" => {
            let ws = workspace_path.ok_or("Workspace path required for project-level agents")?;
            match tool {
                "claude" => Ok(PathBuf::from(ws).join(".claude").join("agents")),
                "gemini" => Ok(PathBuf::from(ws).join(".gemini").join("agents")),
                _ => Err(format!(
                    "Tool '{}' does not support agents",
                    tool
                )),
            }
        }
        _ => Err(format!("Unknown scope: {}", scope)),
    }
}

/// Write an agent .md file for a specific tool and scope.
///
/// Creates `{agents_dir}/{filename}.md` and returns the full path.
pub fn write_agent(
    filename: &str,
    content: &str,
    tool: &str,
    scope: &str,
    workspace_path: Option<&str>,
) -> Result<String, String> {
    let safe_name = validate_agent_name(filename)?;
    let agents_dir = agents_dir_for_tool(tool, scope, workspace_path)?;
    let agent_path = agents_dir.join(format!("{}.md", safe_name));

    atomic_write(&agent_path, content)?;

    Ok(agent_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_agent_name_accepts_safe_names() {
        assert_eq!(validate_agent_name("code-reviewer").unwrap(), "code-reviewer");
        assert_eq!(validate_agent_name("agent_v2").unwrap(), "agent_v2");
        assert_eq!(validate_agent_name("my.agent").unwrap(), "my.agent");
    }

    #[test]
    fn test_validate_agent_name_rejects_path_traversal() {
        assert!(validate_agent_name("../evil").is_err());
        assert!(validate_agent_name("..").is_err());
        assert!(validate_agent_name("foo/bar").is_err());
        assert!(validate_agent_name(r"foo\bar").is_err());
    }

    #[test]
    fn test_validate_agent_name_rejects_empty() {
        assert!(validate_agent_name("").is_err());
        assert!(validate_agent_name("   ").is_err());
    }

    #[test]
    fn test_agents_dir_for_tool_user() {
        let claude = agents_dir_for_tool("claude", "user", None).unwrap();
        assert!(claude.to_string_lossy().contains(".claude/agents"));

        let gemini = agents_dir_for_tool("gemini", "user", None).unwrap();
        assert!(gemini.to_string_lossy().contains(".gemini/agents"));
    }

    #[test]
    fn test_agents_dir_for_tool_unsupported() {
        assert!(agents_dir_for_tool("codex", "user", None).is_err());
    }

    #[test]
    fn test_agents_dir_for_tool_project() {
        let claude = agents_dir_for_tool("claude", "project", Some("/my/project")).unwrap();
        assert!(claude.to_string_lossy().contains("/my/project/.claude/agents"));
    }
}
