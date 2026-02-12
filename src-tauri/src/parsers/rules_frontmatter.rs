//! Parser for YAML frontmatter in rule files (.claude/rules/*.md)
//!
//! Claude Code rules support a `paths:` field in YAML frontmatter to scope
//! when the rule is loaded. Rules without `paths:` are loaded unconditionally.
//!
//! ```markdown
//! ---
//! paths:
//!   - "src/domain/ai/**"
//!   - "src/domain/agents/**"
//! ---
//! # AI Feature Development
//! Instructions here...
//! ```

use serde::Deserialize;

/// YAML frontmatter for a rule file
#[derive(Debug, Deserialize)]
struct RuleFrontmatter {
    /// Glob patterns that scope when this rule is loaded
    #[serde(default)]
    paths: Option<Vec<String>>,
}

/// Parsed scoping info from a rule file
#[derive(Debug, Clone)]
pub struct ParsedRuleScoping {
    /// Glob patterns from frontmatter. None = always loaded.
    pub paths: Option<Vec<String>>,
    /// The markdown content after stripping frontmatter
    pub body: String,
}

/// Parse rule content for scoping frontmatter.
/// Returns None for paths if no frontmatter or no `paths:` field.
pub fn parse_rule_frontmatter(content: &str) -> ParsedRuleScoping {
    let trimmed = content.trim();

    if trimmed.starts_with("---") {
        let after_first_delimiter = &trimmed[3..];
        if let Some(end_pos) = after_first_delimiter.find("\n---") {
            let frontmatter_str = after_first_delimiter[..end_pos].trim();
            let body = after_first_delimiter[end_pos + 4..].trim().to_string();

            if let Ok(fm) = serde_yaml::from_str::<RuleFrontmatter>(frontmatter_str) {
                // Filter out empty paths lists
                let paths = fm.paths.filter(|p| !p.is_empty());
                return ParsedRuleScoping { paths, body };
            }
        }
    }

    // No frontmatter or parse failure: return content as-is, no scoping
    ParsedRuleScoping {
        paths: None,
        body: content.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_paths_frontmatter() {
        let content = r#"---
paths:
  - "src/domain/ai/**"
  - "src/domain/agents/**"
---
# AI Rules
Content here."#;
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_some());
        let paths = result.paths.unwrap();
        assert_eq!(paths.len(), 2);
        assert_eq!(paths[0], "src/domain/ai/**");
        assert_eq!(paths[1], "src/domain/agents/**");
        assert!(result.body.contains("# AI Rules"));
    }

    #[test]
    fn test_parse_no_paths_field() {
        let content = r#"---
description: Just a description
---
# Rules"#;
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_none());
        assert!(result.body.contains("# Rules"));
    }

    #[test]
    fn test_parse_no_frontmatter() {
        let content = "# Just markdown\nNo frontmatter here.";
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_none());
        assert_eq!(result.body, content);
    }

    #[test]
    fn test_parse_empty_paths() {
        let content = r#"---
paths: []
---
# Rules"#;
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_none()); // empty list treated as None
    }

    #[test]
    fn test_parse_single_path() {
        let content = r#"---
paths:
  - "src/**/*.ts"
---
# TypeScript rules"#;
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_some());
        let paths = result.paths.unwrap();
        assert_eq!(paths.len(), 1);
        assert_eq!(paths[0], "src/**/*.ts");
    }

    #[test]
    fn test_parse_unclosed_frontmatter() {
        let content = "---\npaths:\n  - \"src/**\"\n# Missing closing delimiter";
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_none());
        assert_eq!(result.body, content);
    }

    #[test]
    fn test_parse_invalid_yaml() {
        let content = "---\n: invalid yaml [[\n---\n# Rules";
        let result = parse_rule_frontmatter(content);
        // Invalid YAML falls through gracefully
        assert!(result.paths.is_none());
    }

    #[test]
    fn test_parse_brace_expansion_paths() {
        let content = r#"---
paths:
  - "src/**/*.{ts,tsx}"
  - "{src,lib}/**/*.ts"
---
# TypeScript rules"#;
        let result = parse_rule_frontmatter(content);
        assert!(result.paths.is_some());
        let paths = result.paths.unwrap();
        assert_eq!(paths.len(), 2);
        assert_eq!(paths[0], "src/**/*.{ts,tsx}");
    }
}
