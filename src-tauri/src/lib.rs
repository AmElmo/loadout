use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

mod commands;
mod converters;
mod parsers;
mod scanners;
mod workspace;
mod writers;

use commands::{
    add_mcp_to_tools, install_skill_to_tools, preview_mcp_configs, scan_hooks, scan_mcps,
    scan_rules, scan_skills, sync_mcp_to_tools,
};
use scanners::workspaces::{discover_workspaces, DiscoveryResult};

#[derive(Debug, Error)]
pub enum LoadoutError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Path error: {0}")]
    Path(String),
}

impl Serialize for LoadoutError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub repo_root: Option<String>,
    pub name: String,
}

/// Find the git repository root by walking up from the given path
#[tauri::command]
fn find_repo_root(path: String) -> Option<String> {
    workspace::find_repo_root(&PathBuf::from(&path)).map(|p| p.to_string_lossy().to_string())
}

/// Get workspace info including detected repo root
#[tauri::command]
fn get_workspace_info(path: String) -> Result<WorkspaceInfo, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let repo_root = workspace::find_repo_root(&path_buf);
    let effective_root = repo_root.as_ref().unwrap_or(&path_buf);

    let name = effective_root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    Ok(WorkspaceInfo {
        path: path.clone(),
        repo_root: repo_root.map(|p| p.to_string_lossy().to_string()),
        name,
    })
}

/// Get the user's home directory
#[tauri::command]
fn get_home_dir() -> Option<String> {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string())
}

/// Discover workspaces with AI CLI configs across the home directory
#[tauri::command]
fn discover_ai_workspaces(max_depth: Option<u32>) -> Result<DiscoveryResult, String> {
    discover_workspaces(max_depth.unwrap_or(4))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            find_repo_root,
            get_workspace_info,
            get_home_dir,
            scan_mcps,
            scan_skills,
            scan_rules,
            scan_hooks,
            discover_ai_workspaces,
            add_mcp_to_tools,
            preview_mcp_configs,
            install_skill_to_tools,
            sync_mcp_to_tools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
