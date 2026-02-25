//! Tauri commands for repo scanning (find repos without rules)

use crate::scanners::repos::{scan_repos_without_rules as do_scan, RepoScanResult};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use tauri::Emitter;

/// Scan home directory for git repos without any AI rules files.
/// Runs on a blocking thread so the main thread stays free for UI rendering.
#[tauri::command]
pub async fn scan_repos_without_rules(max_depth: Option<u32>) -> Result<RepoScanResult, String> {
    let depth = max_depth.unwrap_or(5);
    tauri::async_runtime::spawn_blocking(move || do_scan(depth))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Result of CLI rule generation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRulesResult {
    pub success: bool,
    pub file_created: Option<String>,
    pub error: Option<String>,
}

/// A single line of CLI output, scoped to a repo path
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOutputLine {
    pub repo_path: String,
    pub line: String,
}

/// Spawn a CLI tool to generate rules for a repo, streaming output via events
#[tauri::command]
pub async fn create_rules_with_cli(
    app: tauri::AppHandle,
    tool: String,
    repo_path: String,
    prompt: String,
) -> Result<CreateRulesResult, String> {
    let target_file = match tool.as_str() {
        "claude" => "CLAUDE.md",
        "codex" => "AGENTS.md",
        "gemini" => "GEMINI.md",
        _ => return Err(format!("Unknown tool: {}", tool)),
    };

    let repo = Path::new(&repo_path);
    if !repo.is_dir() {
        return Err(format!("Repo path does not exist: {}", repo_path));
    }

    // Build the command based on which tool
    let (cmd_name, args) = match tool.as_str() {
        "claude" => ("claude", vec!["-p".to_string(), prompt.clone(), "--output-format".to_string(), "text".to_string()]),
        "codex" => ("codex", vec!["-q".to_string(), prompt.clone()]),
        "gemini" => ("gemini", vec!["-p".to_string(), prompt.clone()]),
        _ => unreachable!(),
    };

    // Check if the CLI is available
    let which_result = Command::new("which")
        .arg(cmd_name)
        .output()
        .map_err(|e| format!("Failed to check for {}: {}", cmd_name, e))?;

    if !which_result.status.success() {
        return Err(format!(
            "{} is not installed or not found in PATH",
            cmd_name
        ));
    }

    // Spawn the CLI process
    let mut child = Command::new(cmd_name)
        .args(&args)
        .current_dir(repo)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", cmd_name, e))?;

    // Stream stdout
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        let rp = repo_path.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_clone.emit("cli-output", CliOutputLine {
                        repo_path: rp.clone(),
                        line,
                    });
                }
            }
        });
    }

    // Stream stderr
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        let rp = repo_path.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_clone.emit("cli-output", CliOutputLine {
                        repo_path: rp.clone(),
                        line,
                    });
                }
            }
        });
    }

    // Wait for the process to finish
    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for {}: {}", cmd_name, e))?;

    // Check if the target file was created
    let target_path = repo.join(target_file);
    let file_created = if target_path.is_file() {
        Some(target_path.to_string_lossy().to_string())
    } else {
        None
    };

    if status.success() && file_created.is_some() {
        Ok(CreateRulesResult {
            success: true,
            file_created,
            error: None,
        })
    } else if !status.success() {
        Ok(CreateRulesResult {
            success: false,
            file_created: None,
            error: Some(format!(
                "{} exited with code {}",
                cmd_name,
                status.code().unwrap_or(-1)
            )),
        })
    } else {
        // CLI succeeded but file wasn't created
        Ok(CreateRulesResult {
            success: false,
            file_created: None,
            error: Some(format!(
                "{} completed but {} was not created. The CLI may need different flags.",
                cmd_name, target_file
            )),
        })
    }
}
