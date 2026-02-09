//! Skill writer — installs SKILL.md files to the correct path per tool

use crate::writers::atomic::atomic_write;
use std::path::PathBuf;

/// Tool-specific user-level skill directories
fn skill_dir_for_tool(tool: &str) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    match tool {
        "claude" => Ok(home.join(".claude").join("skills")),
        "codex" => Ok(home.join(".agents").join("skills")),
        "gemini" => Ok(home.join(".gemini").join("skills")),
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

/// Write a SKILL.md file for a specific tool.
///
/// Creates `{skills_dir}/{name}/SKILL.md` and returns the full path.
pub fn write_skill(name: &str, content: &str, tool: &str) -> Result<String, String> {
    let skills_dir = skill_dir_for_tool(tool)?;
    let skill_dir = skills_dir.join(name);
    let skill_path = skill_dir.join("SKILL.md");

    atomic_write(&skill_path, content)?;

    Ok(skill_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_skill_dir_for_tool() {
        let claude = skill_dir_for_tool("claude").unwrap();
        assert!(claude.to_string_lossy().contains(".claude/skills"));

        let codex = skill_dir_for_tool("codex").unwrap();
        assert!(codex.to_string_lossy().contains(".agents/skills"));

        let gemini = skill_dir_for_tool("gemini").unwrap();
        assert!(gemini.to_string_lossy().contains(".gemini/skills"));
    }

    #[test]
    fn test_skill_dir_for_unknown_tool() {
        assert!(skill_dir_for_tool("unknown").is_err());
    }

    #[test]
    fn test_write_skill_creates_file() {
        // We can't easily test write_skill directly since it uses home_dir,
        // but we can test the atomic_write portion with a temp dir
        let dir = TempDir::new().unwrap();
        let skill_path = dir.path().join("my-skill").join("SKILL.md");
        let content = "---\nname: my-skill\ndescription: A test skill\n---\n\n# Instructions\nDo something useful.\n";

        atomic_write(&skill_path, content).unwrap();

        assert!(skill_path.exists());
        let written = fs::read_to_string(&skill_path).unwrap();
        assert_eq!(written, content);
    }
}
