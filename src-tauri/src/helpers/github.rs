//! Shared GitHub URL parsing and raw content fetching helpers.
//!
//! Used by both skill and agent import commands.

use serde::Deserialize;

/// Parsed GitHub URL structure
#[derive(Debug)]
pub enum GitHubUrl {
    /// A single file: github.com/org/repo/blob/{ref_and_path}
    Blob {
        owner: String,
        repo: String,
        /// Combined branch + path (cannot be split without API lookup)
        ref_and_path: String,
    },
    /// A directory: github.com/org/repo/tree/{ref_and_path}
    Tree {
        owner: String,
        repo: String,
        /// Combined branch + path (cannot be split without API lookup)
        ref_and_path: String,
    },
    /// Bare repo: github.com/org/repo
    Repo {
        owner: String,
        repo: String,
    },
}

/// Parse a GitHub URL into structured components.
///
/// Note: branch and path are stored together as `ref_and_path` because GitHub
/// branch names can contain `/` (e.g. `feature/foo`), making it impossible to
/// determine the split from the URL alone. Use `resolve_github_branch()` with
/// the GitHub API to disambiguate when separate values are needed.
pub fn parse_github_url(url: &str) -> Option<GitHubUrl> {
    let rest = url
        .strip_prefix("https://github.com/")
        .or_else(|| url.strip_prefix("http://github.com/"))?;

    let parts: Vec<&str> = rest.splitn(4, '/').collect();

    if parts.len() >= 4 && parts[2] == "blob" {
        return Some(GitHubUrl::Blob {
            owner: parts[0].to_string(),
            repo: parts[1].to_string(),
            ref_and_path: parts[3].to_string(),
        });
    }

    if parts.len() >= 4 && parts[2] == "tree" {
        return Some(GitHubUrl::Tree {
            owner: parts[0].to_string(),
            repo: parts[1].to_string(),
            ref_and_path: parts[3].trim_end_matches('/').to_string(),
        });
    }

    if parts.len() == 2 || (parts.len() == 3 && parts[2].is_empty()) {
        return Some(GitHubUrl::Repo {
            owner: parts[0].to_string(),
            repo: parts[1].trim_end_matches('/').to_string(),
        });
    }

    None
}

/// A Git reference from the GitHub matching-refs API
#[derive(Debug, Deserialize)]
struct GitRef {
    #[serde(rename = "ref")]
    ref_name: String,
}

/// Resolve a combined `ref_and_path` string (e.g. "feature/branch/dir/file")
/// into separate `(branch, path)` by querying the GitHub matching-refs API.
///
/// GitHub branch names can contain `/`, so we cannot determine the split from
/// the URL alone. This function queries GitHub for all branches starting with
/// the first path segment and picks the longest match.
///
/// Falls back to treating the first segment as the branch if the API call fails.
pub async fn resolve_github_branch(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    ref_and_path: &str,
) -> Result<(String, String), String> {
    let segments: Vec<&str> = ref_and_path.split('/').collect();
    if segments.is_empty() {
        return Ok((String::new(), String::new()));
    }
    if segments.len() == 1 {
        return Ok((segments[0].to_string(), String::new()));
    }

    // Query matching-refs API with the first segment as prefix
    let api_url = format!(
        "https://api.github.com/repos/{}/{}/git/matching-refs/heads/{}",
        owner, repo, segments[0]
    );

    let response = client
        .get(&api_url)
        .header("User-Agent", "Loadout/0.1")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await;

    if let Ok(response) = response {
        if response.status().is_success() {
            if let Ok(refs) = response.json::<Vec<GitRef>>().await {
                // Find the longest branch name that is a prefix of ref_and_path
                let mut best_branch: Option<String> = None;

                for git_ref in &refs {
                    if let Some(branch) = git_ref.ref_name.strip_prefix("refs/heads/") {
                        if (ref_and_path == branch
                            || (ref_and_path.starts_with(branch)
                                && ref_and_path.as_bytes().get(branch.len()) == Some(&b'/')))
                            && best_branch
                                .as_ref()
                                .map_or(true, |b| branch.len() > b.len())
                        {
                            best_branch = Some(branch.to_string());
                        }
                    }
                }

                if let Some(branch) = best_branch {
                    let path = if ref_and_path.len() > branch.len() {
                        ref_and_path[branch.len()..]
                            .trim_start_matches('/')
                            .to_string()
                    } else {
                        String::new()
                    };
                    return Ok((branch, path));
                }
            }
        }
    }

    // Fallback: first segment as branch (original behavior)
    Ok((segments[0].to_string(), segments[1..].join("/")))
}

/// Fetch raw content from a URL, rejecting HTML responses
pub async fn fetch_raw_content(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let response = client
        .get(url)
        .header("User-Agent", "Loadout/0.1")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} fetching {}", response.status(), url));
    }

    // Check content type — reject HTML responses
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if content_type.contains("text/html") {
        return Err(
            "URL returned an HTML page instead of raw markdown. For GitHub, use a raw URL like https://raw.githubusercontent.com/org/repo/main/file.md".to_string()
        );
    }

    let raw_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Double-check: sometimes content-type is missing/wrong, detect HTML by content
    let trimmed = raw_content.trim_start();
    if trimmed.starts_with("<!DOCTYPE") || trimmed.starts_with("<html") {
        return Err(
            "URL returned an HTML page instead of raw markdown. For GitHub, use a raw URL like https://raw.githubusercontent.com/org/repo/main/file.md".to_string()
        );
    }

    Ok(raw_content)
}
