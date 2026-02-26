use crate::scanners::plugins::{scan_all_plugins, PluginScanResult};

#[tauri::command]
pub fn scan_plugins(workspace_path: Option<String>) -> Result<PluginScanResult, String> {
    scan_all_plugins(workspace_path.as_deref())
}
