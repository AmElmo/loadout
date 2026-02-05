use std::path::{Path, PathBuf};

/// Find the git repository root by walking up from the given path.
/// Returns the directory containing .git, or None if not found.
pub fn find_repo_root(path: &Path) -> Option<PathBuf> {
    let mut current = if path.is_file() {
        path.parent()?.to_path_buf()
    } else {
        path.to_path_buf()
    };

    loop {
        if current.join(".git").exists() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_find_repo_root_with_git() {
        let temp = tempdir().unwrap();
        let git_dir = temp.path().join(".git");
        fs::create_dir(&git_dir).unwrap();

        let subdir = temp.path().join("src").join("components");
        fs::create_dir_all(&subdir).unwrap();

        let result = find_repo_root(&subdir);
        assert_eq!(result, Some(temp.path().to_path_buf()));
    }

    #[test]
    fn test_find_repo_root_without_git() {
        let temp = tempdir().unwrap();
        let result = find_repo_root(temp.path());
        assert_eq!(result, None);
    }
}
