//! Parser for SKILL.md files (Open Agent Skills Standard)
//!
//! Skills use YAML frontmatter for metadata and markdown for content:
//! ```markdown
//! ---
//! name: skill-name
//! description: When to use this skill
//! metadata:
//!   short-description: Optional user-facing description
//! ---
//!
//! ## Instructions
//! Your skill content here...
//! ```

use serde::Deserialize;
use std::fs;
use std::path::Path;

/// Metadata section in SKILL.md frontmatter
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub struct SkillMetadata {
    pub short_description: Option<String>,
}

/// Parsed skill from a SKILL.md file
#[derive(Debug, Clone)]
pub struct ParsedSkill {
    pub name: String,
    pub description: String,
    pub metadata: Option<SkillMetadata>,
    pub content: String,
}

/// YAML frontmatter structure
#[derive(Debug, Deserialize)]
struct SkillFrontmatter {
    name: String,
    description: String,
    #[serde(default)]
    metadata: Option<SkillMetadata>,
}

/// Parse a SKILL.md file and extract frontmatter + content.
/// Falls back to directory name and first meaningful line if no frontmatter is present.
pub fn parse_skill_md(path: &Path) -> Result<ParsedSkill, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    // Derive fallback name from parent directory (e.g., "verify-work" from ".../verify-work/SKILL.md")
    let fallback_name = path
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    parse_skill_content(&content, &fallback_name)
}

/// Parse skill content string (separated for testing).
/// Tries YAML frontmatter first, falls back to plain markdown.
pub fn parse_skill_content(content: &str, fallback_name: &str) -> Result<ParsedSkill, String> {
    let content = content.trim();

    // Try parsing with YAML frontmatter first
    if content.starts_with("---") {
        if let Some(result) = try_parse_frontmatter(content) {
            return Ok(result);
        }
    }

    // Fallback: treat as plain markdown
    parse_plain_markdown(content, fallback_name)
}

/// Try to parse content with YAML frontmatter, returns None on failure
fn try_parse_frontmatter(content: &str) -> Option<ParsedSkill> {
    let after_first_delimiter = &content[3..];
    let end_pos = after_first_delimiter.find("\n---")?;

    let frontmatter_str = after_first_delimiter[..end_pos].trim();
    let markdown_content = after_first_delimiter[end_pos + 4..].trim();

    let frontmatter: SkillFrontmatter = serde_yaml::from_str(frontmatter_str).ok()?;

    Some(ParsedSkill {
        name: frontmatter.name,
        description: frontmatter.description,
        metadata: frontmatter.metadata,
        content: markdown_content.to_string(),
    })
}

/// Parse a plain markdown SKILL.md without frontmatter.
/// Uses the directory name as skill name and extracts the first meaningful
/// non-heading line as description.
fn parse_plain_markdown(content: &str, fallback_name: &str) -> Result<ParsedSkill, String> {
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
        description = format!("Skill from {}", fallback_name);
    }

    // Truncate long descriptions
    if description.len() > 120 {
        description = format!("{}...", &description[..117]);
    }

    Ok(ParsedSkill {
        name: fallback_name.to_string(),
        description,
        metadata: None,
        content: content.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_skill() {
        let content = r#"---
name: test-skill
description: A test skill for unit tests
---

## Instructions
This is the skill content.
"#;
        let skill = parse_skill_content(content, "test-skill").unwrap();
        assert_eq!(skill.name, "test-skill");
        assert_eq!(skill.description, "A test skill for unit tests");
        assert!(skill.content.contains("## Instructions"));
        assert!(skill.content.contains("This is the skill content."));
    }

    #[test]
    fn test_parse_skill_with_metadata() {
        let content = r#"---
name: fancy-skill
description: A skill with metadata
metadata:
  short-description: Fancy short desc
---

Content here.
"#;
        let skill = parse_skill_content(content, "fancy-skill").unwrap();
        assert_eq!(skill.name, "fancy-skill");
        assert!(skill.metadata.is_some());
        assert_eq!(
            skill.metadata.unwrap().short_description,
            Some("Fancy short desc".to_string())
        );
    }

    #[test]
    fn test_parse_no_frontmatter_uses_fallback() {
        let content = "# Verify Work Skill\n\n**IMPORTANT: Only use this skill when requested.**\n\nDo the work.";
        let skill = parse_skill_content(content, "verify-work").unwrap();
        assert_eq!(skill.name, "verify-work");
        assert_eq!(skill.description, "IMPORTANT: Only use this skill when requested.");
        assert!(skill.content.contains("# Verify Work Skill"));
    }

    #[test]
    fn test_parse_unclosed_frontmatter_falls_back() {
        let content = r#"---
name: broken
description: Missing closing delimiter
"#;
        // Falls back to plain markdown parsing with the fallback name
        let skill = parse_skill_content(content, "broken-skill").unwrap();
        assert_eq!(skill.name, "broken-skill");
    }
}
