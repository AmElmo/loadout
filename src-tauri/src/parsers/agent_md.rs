//! Parser for agent .md files (Claude Code and Gemini CLI subagents)
//!
//! Agents use YAML frontmatter for metadata and markdown for the system prompt:
//! ```markdown
//! ---
//! name: code-reviewer
//! description: Reviews code for quality and best practices
//! tools: Read, Glob, Grep
//! model: sonnet
//! maxTurns: 50
//! permissionMode: default
//! ---
//!
//! You are a senior code reviewer. When analyzing code, focus on...
//! ```

use serde::Deserialize;
use std::fs;
use std::path::Path;

/// Parsed agent from a .md file
#[derive(Debug, Clone)]
pub struct ParsedAgent {
    pub name: String,
    pub description: String,
    pub content: String,
    pub tools: Option<String>,
    pub model: Option<String>,
    pub max_turns: Option<u32>,
    pub permission_mode: Option<String>,
}

/// YAML frontmatter structure for agent files
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentFrontmatter {
    name: Option<String>,
    description: Option<String>,
    #[serde(default)]
    tools: Option<StringOrList>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default)]
    max_turns: Option<u32>,
    #[serde(default)]
    permission_mode: Option<String>,
}

/// Tools can be specified as a comma-separated string or a YAML list
#[derive(Debug, Deserialize, Clone)]
#[serde(untagged)]
enum StringOrList {
    Str(String),
    List(Vec<String>),
}

impl StringOrList {
    fn into_string(self) -> String {
        match self {
            StringOrList::Str(s) => s,
            StringOrList::List(v) => v.join(", "),
        }
    }
}

/// Parse an agent .md file and extract frontmatter + content.
/// Falls back to filename-derived name and first meaningful line as description.
pub fn parse_agent_md(path: &Path) -> Result<ParsedAgent, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    // Derive fallback name from filename (e.g., "code-reviewer" from "code-reviewer.md")
    let fallback_name = path
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    parse_agent_content(&content, &fallback_name)
}

/// Parse agent content string (separated for testing).
/// Tries YAML frontmatter first, falls back to plain markdown.
pub fn parse_agent_content(content: &str, fallback_name: &str) -> Result<ParsedAgent, String> {
    let content = content.trim();

    // Try parsing with YAML frontmatter first
    if content.starts_with("---") {
        if let Some(result) = try_parse_frontmatter(content, fallback_name) {
            return Ok(result);
        }
    }

    // Fallback: treat as plain markdown
    parse_plain_markdown(content, fallback_name)
}

/// Try to parse content with YAML frontmatter, returns None on failure
fn try_parse_frontmatter(content: &str, fallback_name: &str) -> Option<ParsedAgent> {
    let after_first_delimiter = &content[3..];
    let end_pos = after_first_delimiter.find("\n---")?;

    let frontmatter_str = after_first_delimiter[..end_pos].trim();
    let markdown_content = after_first_delimiter[end_pos + 4..].trim();

    let frontmatter: AgentFrontmatter = serde_yaml::from_str(frontmatter_str).ok()?;

    let name = frontmatter
        .name
        .unwrap_or_else(|| fallback_name.to_string());

    let description = frontmatter
        .description
        .unwrap_or_else(|| format!("Agent from {}", fallback_name));

    Some(ParsedAgent {
        name,
        description,
        content: markdown_content.to_string(),
        tools: frontmatter.tools.map(|t| t.into_string()),
        model: frontmatter.model,
        max_turns: frontmatter.max_turns,
        permission_mode: frontmatter.permission_mode,
    })
}

/// Parse a plain markdown agent file without frontmatter.
/// Uses the filename as agent name and extracts the first meaningful
/// non-heading line as description.
fn parse_plain_markdown(content: &str, fallback_name: &str) -> Result<ParsedAgent, String> {
    let mut description = String::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        // Strip bold markers for cleaner description
        description = trimmed.replace("**", "");
        break;
    }

    if description.is_empty() {
        description = format!("Agent from {}", fallback_name);
    }

    // Truncate long descriptions
    if description.len() > 120 {
        description = format!("{}...", &description[..117]);
    }

    Ok(ParsedAgent {
        name: fallback_name.to_string(),
        description,
        content: content.to_string(),
        tools: None,
        model: None,
        max_turns: None,
        permission_mode: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_full_frontmatter() {
        let content = r#"---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
maxTurns: 50
permissionMode: default
---

You are a senior code reviewer. When analyzing code, focus on..."#;
        let agent = parse_agent_content(content, "fallback").unwrap();
        assert_eq!(agent.name, "code-reviewer");
        assert_eq!(
            agent.description,
            "Reviews code for quality and best practices"
        );
        assert_eq!(agent.tools.as_deref(), Some("Read, Glob, Grep"));
        assert_eq!(agent.model.as_deref(), Some("sonnet"));
        assert_eq!(agent.max_turns, Some(50));
        assert_eq!(agent.permission_mode.as_deref(), Some("default"));
        assert!(agent.content.contains("You are a senior code reviewer"));
    }

    #[test]
    fn test_parse_tools_as_list() {
        let content = r#"---
name: helper
description: A helper agent
tools:
  - Read
  - Glob
  - Grep
---

Help the user."#;
        let agent = parse_agent_content(content, "helper").unwrap();
        assert_eq!(agent.tools.as_deref(), Some("Read, Glob, Grep"));
    }

    #[test]
    fn test_parse_minimal_frontmatter() {
        let content = r#"---
name: simple-agent
---

Do something useful."#;
        let agent = parse_agent_content(content, "fallback").unwrap();
        assert_eq!(agent.name, "simple-agent");
        assert_eq!(agent.description, "Agent from fallback");
        assert!(agent.tools.is_none());
        assert!(agent.model.is_none());
        assert!(agent.max_turns.is_none());
    }

    #[test]
    fn test_parse_no_frontmatter() {
        let content = "# Code Reviewer\n\nYou review code for quality.\n\nFocus on best practices.";
        let agent = parse_agent_content(content, "code-reviewer").unwrap();
        assert_eq!(agent.name, "code-reviewer");
        assert_eq!(agent.description, "You review code for quality.");
        assert!(agent.tools.is_none());
    }

    #[test]
    fn test_parse_unclosed_frontmatter_falls_back() {
        let content = r#"---
name: broken
description: Missing closing delimiter
"#;
        let agent = parse_agent_content(content, "broken-agent").unwrap();
        assert_eq!(agent.name, "broken-agent");
    }

    #[test]
    fn test_parse_empty_frontmatter() {
        let content = r#"---
---

Just a prompt."#;
        let agent = parse_agent_content(content, "my-agent").unwrap();
        assert_eq!(agent.name, "my-agent");
        assert_eq!(agent.description, "Agent from my-agent");
    }
}
