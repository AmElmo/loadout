//! Skill writer — installs SKILL.md files to the correct path per tool
//!
//! Supports two modes:
//! - **Copy**: writes independent copies to each tool's skill directory (legacy behavior)
//! - **Link**: writes a canonical copy to `~/.agents/skills/<name>/` and creates
//!   symlinks from each tool's path to the canonical directory

use crate::writers::atomic::atomic_write;
use crate::writers::backup::create_backup;
use std::fs;
use std::path::{Path, PathBuf};

/// Result of a link-mode skill install
pub struct LinkResult {
    /// Canonical directory path (e.g. ~/.agents/skills/<name>)
    pub canonical_path: String,
    /// All modified/created paths (canonical files + symlink paths)
    pub modified_files: Vec<String>,
    /// Errors per tool (non-fatal: fallback to copy)
    pub errors: Vec<String>,
    /// True if at least one symlink creation failed and fell back to copy
    pub symlink_failed: bool,
}

/// Validate a skill name before using it as a directory name.
///
/// Only ASCII alphanumeric characters plus `.`, `_`, and `-` are allowed.
/// Path separators and traversal sequences are rejected.
pub fn validate_skill_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Skill name is required".to_string());
    }

    if trimmed == "." || trimmed == ".." {
        return Err("Skill name cannot be '.' or '..'".to_string());
    }

    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains('\0') {
        return Err("Skill name cannot contain path separators".to_string());
    }

    if !trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(
            "Skill name can only contain letters, numbers, hyphens, underscores, and dots"
                .to_string(),
        );
    }

    Ok(trimmed.to_string())
}

/// Tool-specific user-level skill directories (public for use by remove commands)
pub fn skill_dir_for_tool_pub(tool: &str) -> Result<PathBuf, String> {
    skill_dir_for_tool(tool)
}

/// Tool-specific project-level skill directories
pub fn skill_dir_for_tool_project(tool: &str, workspace_path: &str) -> Result<PathBuf, String> {
    let ws = PathBuf::from(workspace_path);
    match tool {
        "claude" => Ok(ws.join(".claude").join("skills")),
        "codex" => Ok(ws.join(".codex").join("skills")),
        "gemini" => Ok(ws.join(".gemini").join("skills")),
        "cursor" => Ok(ws.join(".cursor").join("skills")),
        "copilot" => Ok(ws.join(".copilot").join("skills")),
        "windsurf" => Ok(ws.join(".codeium").join("windsurf").join("skills")),
        "roo" => Ok(ws.join(".roo").join("skills")),
        "cline" => Ok(ws.join(".cline").join("skills")),
        "kilo" => Ok(ws.join(".kilocode").join("skills")),
        "opencode" => Ok(ws.join(".config").join("opencode").join("skills")),
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

/// Tool-specific user-level skill directories
fn skill_dir_for_tool(tool: &str) -> Result<PathBuf, String> {
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    match tool {
        "claude" => Ok(home.join(".claude").join("skills")),
        "codex" => Ok(home.join(".agents").join("skills")),
        "gemini" => Ok(home.join(".gemini").join("skills")),
        "cursor" => Ok(home.join(".cursor").join("skills")),
        "copilot" => Ok(home.join(".copilot").join("skills")),
        "windsurf" => Ok(home.join(".codeium").join("windsurf").join("skills")),
        "roo" => Ok(home.join(".roo").join("skills")),
        "cline" => Ok(home.join(".cline").join("skills")),
        "kilo" => Ok(home.join(".kilocode").join("skills")),
        "opencode" => Ok(home.join(".config").join("opencode").join("skills")),
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

/// Write a SKILL.md file for a specific tool.
///
/// Creates `{skills_dir}/{name}/SKILL.md` and returns the full path.
pub fn write_skill(name: &str, content: &str, tool: &str) -> Result<String, String> {
    let safe_name = validate_skill_name(name)?;
    let skills_dir = skill_dir_for_tool(tool)?;
    let skill_dir = skills_dir.join(&safe_name);
    let skill_path = skill_dir.join("SKILL.md");

    atomic_write(&skill_path, content)?;

    Ok(skill_path.to_string_lossy().to_string())
}

/// Validate a relative file path for safety (no path traversal).
fn validate_relative_path(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("File path is empty".to_string());
    }
    if path.contains("..") {
        return Err(format!("Path traversal not allowed: {}", path));
    }
    if path.starts_with('/') || path.starts_with('\\') {
        return Err(format!("Absolute paths not allowed: {}", path));
    }
    if path.contains('\0') {
        return Err("Null bytes not allowed in path".to_string());
    }
    Ok(())
}

/// Write a SKILL.md plus companion files for a specific tool.
///
/// Creates `{skills_dir}/{name}/SKILL.md` and companion files, returns all written paths.
pub fn write_skill_with_files(
    name: &str,
    content: &str,
    files: &[crate::commands::sync::SkillFile],
    tool: &str,
) -> Result<Vec<String>, String> {
    let safe_name = validate_skill_name(name)?;
    let skills_dir = skill_dir_for_tool(tool)?;
    let skill_dir = skills_dir.join(&safe_name);
    let skill_path = skill_dir.join("SKILL.md");

    let mut written_paths = Vec::new();

    // Write main SKILL.md
    atomic_write(&skill_path, content)?;
    written_paths.push(skill_path.to_string_lossy().to_string());

    // Write companion files
    for file in files {
        validate_relative_path(&file.relative_path)?;
        let file_path = skill_dir.join(&file.relative_path);
        atomic_write(&file_path, &file.content)?;
        written_paths.push(file_path.to_string_lossy().to_string());
    }

    Ok(written_paths)
}

/// Install a skill in Link mode:
/// 1. Write canonical files to `~/.agents/skills/<name>/`
/// 2. Create symlinks from each tool's skill path to the canonical directory
/// 3. Skip codex (it already reads from `~/.agents/skills/`)
/// 4. Fall back to copy if symlink creation fails for any tool
pub fn link_skill(
    name: &str,
    content: &str,
    files: &[crate::commands::sync::SkillFile],
    target_tools: &[String],
) -> Result<LinkResult, String> {
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;

    // Canonical location is always ~/.agents/skills/<name>
    let canonical_dir = home.join(".agents").join("skills").join(name);

    // Step 1: Write canonical files
    let skill_path = canonical_dir.join("SKILL.md");
    atomic_write(&skill_path, content)?;

    let mut modified_files = vec![skill_path.to_string_lossy().to_string()];

    // Write companion files to canonical
    for file in files {
        validate_relative_path(&file.relative_path)?;
        let file_path = canonical_dir.join(&file.relative_path);
        atomic_write(&file_path, &file.content)?;
        modified_files.push(file_path.to_string_lossy().to_string());
    }

    let canonical_path = canonical_dir.to_string_lossy().to_string();
    let mut errors = Vec::new();
    let mut symlink_failed = false;

    // Step 2: Create symlinks for each target tool
    for tool in target_tools {
        // Codex reads from ~/.agents/skills/ natively — no symlink needed
        if tool == "codex" {
            continue;
        }

        let tool_skills_dir = match skill_dir_for_tool(tool) {
            Ok(d) => d,
            Err(e) => {
                errors.push(format!("{}: {}", tool, e));
                continue;
            }
        };
        let tool_skill_path = tool_skills_dir.join(name);

        // Ensure parent directory exists
        if let Err(e) = fs::create_dir_all(&tool_skills_dir) {
            errors.push(format!("{}: Failed to create skills dir: {}", tool, e));
            continue;
        }

        // Try to create symlink; fall back to copy on failure
        match create_symlink(&canonical_dir, &tool_skill_path) {
            Ok(()) => {
                modified_files.push(format!(
                    "{} -> {}",
                    tool_skill_path.to_string_lossy(),
                    canonical_path
                ));
            }
            Err(link_err) => {
                // Symlink failed — fall back to copy for this tool
                symlink_failed = true;
                let copy_result = if files.is_empty() {
                    write_skill(name, content, tool).map(|p| vec![p])
                } else {
                    write_skill_with_files(name, content, files, tool)
                };
                match copy_result {
                    Ok(paths) => {
                        modified_files.extend(paths);
                    }
                    Err(e) => {
                        errors.push(format!(
                            "{}: symlink failed ({}) and copy also failed: {}",
                            tool, link_err, e
                        ));
                    }
                }
            }
        }
    }

    Ok(LinkResult {
        canonical_path,
        modified_files,
        errors,
        symlink_failed,
    })
}

/// Safely create a symlink from `link_path` to `target` (the canonical directory).
///
/// Handles existing content at `link_path`:
/// - Existing valid symlink pointing to the same target: no-op
/// - Existing valid symlink pointing elsewhere: remove and re-create
/// - Existing broken symlink: remove and re-create
/// - Existing directory (real, not symlink): backup then remove and create symlink
/// - Existing file: backup then remove and create symlink
fn create_symlink(target: &Path, link_path: &Path) -> Result<(), String> {
    // Check what currently exists at link_path
    let link_meta = fs::symlink_metadata(link_path);

    if let Ok(meta) = link_meta {
        let file_type = meta.file_type();

        if file_type.is_symlink() {
            // It's already a symlink — check if it points to the right target
            match fs::read_link(link_path) {
                Ok(existing_target) => {
                    // Resolve relative targets against the link's parent before canonicalizing.
                    let existing_target_resolved = if existing_target.is_relative() {
                        link_path
                            .parent()
                            .map(|p| p.join(&existing_target))
                            .unwrap_or_else(|| existing_target.clone())
                    } else {
                        existing_target.clone()
                    };

                    // Canonicalize both to compare (handles relative vs absolute).
                    let canon_target =
                        fs::canonicalize(target).unwrap_or_else(|_| target.to_path_buf());
                    let canon_existing = fs::canonicalize(&existing_target_resolved)
                        .unwrap_or(existing_target_resolved);

                    if canon_target == canon_existing {
                        // Already correctly linked — nothing to do
                        return Ok(());
                    }
                }
                Err(_) => {
                    // Can't read the symlink (broken) — will remove below
                }
            }
            // Remove existing symlink (wrong target or broken)
            fs::remove_file(link_path)
                .map_err(|e| format!("Failed to remove existing symlink: {}", e))?;
        } else if file_type.is_dir() {
            // Existing real directory — backup before replacing
            backup_directory(link_path)?;
            fs::remove_dir_all(link_path)
                .map_err(|e| format!("Failed to remove existing directory: {}", e))?;
        } else {
            // Existing file (unexpected shape) — backup before replacing
            create_backup(link_path)?;
            fs::remove_file(link_path)
                .map_err(|e| format!("Failed to remove existing file: {}", e))?;
        }
    }

    // Create the symlink (directory symlink)
    #[cfg(unix)]
    {
        // Use relative symlink target when possible
        let link_target = compute_relative_target(target, link_path);
        std::os::unix::fs::symlink(&link_target, link_path)
            .map_err(|e| format!("symlink creation failed: {}", e))?;
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(target, link_path)
            .map_err(|e| format!("symlink creation failed: {}", e))?;
    }

    Ok(())
}

/// Compute a relative path from `link_path`'s parent to `target`.
///
/// For example, if target = `/Users/x/.agents/skills/foo` and
/// link_path = `/Users/x/.claude/skills/foo`, the result is `../../.agents/skills/foo`.
///
/// Falls back to the absolute `target` path if relative computation fails.
fn compute_relative_target(target: &Path, link_path: &Path) -> PathBuf {
    let link_parent = match link_path.parent() {
        Some(p) => p,
        None => return target.to_path_buf(),
    };

    // Use canonical paths for reliable relative computation
    let abs_target = fs::canonicalize(target).unwrap_or_else(|_| target.to_path_buf());
    let abs_link_parent =
        fs::canonicalize(link_parent).unwrap_or_else(|_| link_parent.to_path_buf());

    pathdiff::diff_paths(&abs_target, &abs_link_parent).unwrap_or_else(|| target.to_path_buf())
}

/// Backup an existing directory by copying it to the backup location
fn backup_directory(dir_path: &Path) -> Result<(), String> {
    let backup_dir = crate::helpers::effective_home()
        .ok_or("Could not determine home directory")?
        .join(".loadout")
        .join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    let dir_name = dir_path
        .file_name()
        .ok_or("Invalid directory path")?
        .to_string_lossy();
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_dest = backup_dir.join(format!("{}_{}", dir_name, timestamp));

    copy_dir_recursive(dir_path, &backup_dest)
        .map_err(|e| format!("Failed to backup directory: {}", e))?;

    Ok(())
}

/// Recursively copy a directory
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dest_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), &dest_path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::MetadataExt;
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
    fn test_validate_skill_name_accepts_safe_names() {
        assert_eq!(validate_skill_name("my-skill").unwrap(), "my-skill");
        assert_eq!(validate_skill_name("skill_v2").unwrap(), "skill_v2");
        assert_eq!(validate_skill_name("build.tool").unwrap(), "build.tool");
    }

    #[test]
    fn test_validate_skill_name_rejects_path_traversal() {
        assert!(validate_skill_name("../evil").is_err());
        assert!(validate_skill_name("..").is_err());
        assert!(validate_skill_name("foo/bar").is_err());
        assert!(validate_skill_name(r"foo\bar").is_err());
    }

    #[test]
    fn test_write_skill_creates_file() {
        let dir = TempDir::new().unwrap();
        let skill_path = dir.path().join("my-skill").join("SKILL.md");
        let content = "---\nname: my-skill\ndescription: A test skill\n---\n\n# Instructions\nDo something useful.\n";

        atomic_write(&skill_path, content).unwrap();

        assert!(skill_path.exists());
        let written = fs::read_to_string(&skill_path).unwrap();
        assert_eq!(written, content);
    }

    #[test]
    fn test_create_symlink_new() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("canonical").join("my-skill");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("SKILL.md"), "content").unwrap();

        let link = dir.path().join("tool").join("skills").join("my-skill");
        fs::create_dir_all(link.parent().unwrap()).unwrap();

        create_symlink(&target, &link).unwrap();

        assert!(link.is_symlink());
        assert!(link.join("SKILL.md").exists());
        let content = fs::read_to_string(link.join("SKILL.md")).unwrap();
        assert_eq!(content, "content");
    }

    #[test]
    fn test_create_symlink_replaces_existing_symlink() {
        let dir = TempDir::new().unwrap();
        let old_target = dir.path().join("old-target");
        fs::create_dir_all(&old_target).unwrap();
        let new_target = dir.path().join("new-target");
        fs::create_dir_all(&new_target).unwrap();
        fs::write(new_target.join("SKILL.md"), "new").unwrap();

        let link = dir.path().join("link");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&old_target, &link).unwrap();

        create_symlink(&new_target, &link).unwrap();

        assert!(link.is_symlink());
        let _resolved = fs::read_link(&link).unwrap();
        // The resolved path should point to new_target (possibly relative)
        let canonical_resolved = fs::canonicalize(&link).unwrap();
        let canonical_new = fs::canonicalize(&new_target).unwrap();
        assert_eq!(canonical_resolved, canonical_new);
    }

    #[test]
    fn test_create_symlink_replaces_existing_dir() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("canonical");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("SKILL.md"), "canonical").unwrap();

        let link = dir.path().join("existing-dir");
        fs::create_dir_all(&link).unwrap();
        fs::write(link.join("SKILL.md"), "old copy").unwrap();

        create_symlink(&target, &link).unwrap();

        assert!(link.is_symlink());
        let content = fs::read_to_string(link.join("SKILL.md")).unwrap();
        assert_eq!(content, "canonical");
    }

    #[test]
    fn test_create_symlink_idempotent() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("target");
        fs::create_dir_all(&target).unwrap();

        let link = dir.path().join("link");
        create_symlink(&target, &link).unwrap();
        // Call again — should be no-op
        create_symlink(&target, &link).unwrap();

        assert!(link.is_symlink());
    }

    #[test]
    fn test_compute_relative_target() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("a").join("b").join("target");
        fs::create_dir_all(&target).unwrap();
        let link_parent = dir.path().join("c").join("d");
        fs::create_dir_all(&link_parent).unwrap();
        let link = link_parent.join("link");

        let rel = compute_relative_target(&target, &link);
        // Should be a relative path containing ".."
        assert!(rel.to_string_lossy().contains(".."));
    }

    #[test]
    #[cfg(unix)]
    fn test_create_symlink_detects_matching_relative_target_without_replacing() {
        let dir = TempDir::new().unwrap();
        let target = dir.path().join("canonical").join("my-skill");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("SKILL.md"), "content").unwrap();

        let link_parent = dir.path().join("tool").join("skills");
        fs::create_dir_all(&link_parent).unwrap();
        let link = link_parent.join("my-skill");

        let rel_target = pathdiff::diff_paths(&target, &link_parent).unwrap();
        std::os::unix::fs::symlink(&rel_target, &link).unwrap();

        let inode_before = fs::symlink_metadata(&link).unwrap().ino();
        create_symlink(&target, &link).unwrap();
        let inode_after = fs::symlink_metadata(&link).unwrap().ino();

        assert_eq!(inode_before, inode_after);
    }
}
