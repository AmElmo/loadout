//! Plugins scanner for Claude Code CLI, Claude Desktop Cowork, and Gemini CLI Extensions
//!
//! Scans installed plugins across all sources and inventories their components
//! (skills, commands, MCPs, hooks, agents, LSP servers). Also reads marketplace
//! catalogs for available (not yet installed) plugins.
//!
//! This scanner is read-only — it provides visibility but no install/sync capabilities.

use crate::parsers::{
    parse_gemini_extension_json, parse_installed_plugins_json, parse_marketplace_json,
    parse_plugin_json, parse_skill_md,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

// ===== Enums =====

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PluginSourceTool {
    Claude,
    Gemini,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum PluginSourceVariant {
    ClaudeCli,
    ClaudeDesktop,
    GeminiCli,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PluginScope {
    User,
    Project,
    Local,
    Managed,
    System,
}

// ===== Component detail structs =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSkillInfo {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginCommandInfo {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginMCPInfo {
    pub name: String,
    pub mcp_type: String,
    pub url: Option<String>,
    pub command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginHookInfo {
    pub event: String,
    pub matcher: Option<String>,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginAgentInfo {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLSPInfo {
    pub language: String,
    pub command: String,
}

// ===== Component counts and details =====

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginComponents {
    pub skills: usize,
    pub commands: usize,
    pub mcps: usize,
    pub hooks: usize,
    pub agents: usize,
    pub lsp_servers: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginComponentDetails {
    pub skills: Vec<PluginSkillInfo>,
    pub commands: Vec<PluginCommandInfo>,
    pub mcps: Vec<PluginMCPInfo>,
    pub hooks: Vec<PluginHookInfo>,
    pub agents: Vec<PluginAgentInfo>,
    pub lsp_servers: Vec<PluginLSPInfo>,
}

// ===== Main items =====

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: Option<String>,
    pub source_tool: PluginSourceTool,
    pub source_variant: PluginSourceVariant,
    pub marketplace: Option<String>,
    pub scope: PluginScope,
    pub enabled: bool,
    pub path: String,
    pub installed_at: Option<String>,
    pub components: PluginComponents,
    pub component_details: PluginComponentDetails,
    pub category: Option<String>,
    pub readme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplacePluginItem {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: Option<String>,
    pub category: Option<String>,
    pub marketplace: String,
    pub is_installed: bool,
    pub source_variant: PluginSourceVariant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceInfo {
    pub name: String,
    pub source: String,
    pub source_variant: PluginSourceVariant,
    pub last_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginScanResult {
    pub installed: Vec<PluginItem>,
    pub available: Vec<MarketplacePluginItem>,
    pub marketplaces: Vec<MarketplaceInfo>,
}

// ===== ID generation =====

fn generate_plugin_id(name: &str, source_variant: PluginSourceVariant, path: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    format!("{:?}", source_variant).hash(&mut hasher);
    path.hash(&mut hasher);
    format!("plugin_{:x}", hasher.finish())
}

// ===== Component inventory =====

/// Inventory all components inside a plugin directory
fn inventory_components(plugin_dir: &Path) -> (PluginComponents, PluginComponentDetails) {
    let mut details = PluginComponentDetails::default();

    // Skills: skills/*/SKILL.md
    let skills_dir = plugin_dir.join("skills");
    if skills_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&skills_dir) {
            for entry in entries.flatten() {
                let skill_dir = entry.path();
                if skill_dir.is_dir() {
                    let skill_md = skill_dir.join("SKILL.md");
                    if skill_md.exists() {
                        let (name, desc) = match parse_skill_md(&skill_md) {
                            Ok(parsed) => (parsed.name, Some(parsed.description)),
                            Err(_) => {
                                let fallback = skill_dir
                                    .file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_else(|| "unknown".to_string());
                                (fallback, None)
                            }
                        };
                        details.skills.push(PluginSkillInfo { name, description: desc });
                    }
                }
            }
        }
    }

    // Commands: commands/*.md
    let commands_dir = plugin_dir.join("commands");
    if commands_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&commands_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    let (name, desc) = parse_command_frontmatter(&path);
                    details.commands.push(PluginCommandInfo {
                        name,
                        description: desc,
                    });
                }
            }
        }
    }

    // MCPs: .mcp.json
    let mcp_json = plugin_dir.join(".mcp.json");
    if mcp_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&mcp_json) {
            if let Ok(parsed) = serde_json::from_str::<McpJsonFile>(&content) {
                for (name, server) in parsed.mcp_servers {
                    let mcp_type = if server.url.is_some() {
                        "http".to_string()
                    } else {
                        "stdio".to_string()
                    };
                    details.mcps.push(PluginMCPInfo {
                        name,
                        mcp_type,
                        url: server.url,
                        command: server.command,
                    });
                }
            }
        }
    }

    // Hooks: hooks/hooks.json
    let hooks_json = plugin_dir.join("hooks").join("hooks.json");
    if hooks_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&hooks_json) {
            if let Ok(parsed) =
                serde_json::from_str::<HashMap<String, Vec<HookMatcherEntry>>>(&content)
            {
                for (event, matchers) in parsed {
                    for matcher_entry in matchers {
                        for action in &matcher_entry.hooks {
                            if let Some(cmd) = &action.command {
                                details.hooks.push(PluginHookInfo {
                                    event: event.clone(),
                                    matcher: matcher_entry.matcher.clone(),
                                    command: cmd.clone(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Agents: agents/*.md
    let agents_dir = plugin_dir.join("agents");
    if agents_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&agents_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    let (name, desc) = parse_agent_frontmatter(&path);
                    details.agents.push(PluginAgentInfo {
                        name,
                        description: desc,
                    });
                }
            }
        }
    }

    // LSP: .lsp.json
    let lsp_json = plugin_dir.join(".lsp.json");
    if lsp_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&lsp_json) {
            if let Ok(parsed) = serde_json::from_str::<HashMap<String, LspEntry>>(&content) {
                for (language, entry) in parsed {
                    details.lsp_servers.push(PluginLSPInfo {
                        language,
                        command: entry.command,
                    });
                }
            }
        }
    }

    // Sort all component lists by name for consistent output
    details.skills.sort_by(|a, b| a.name.cmp(&b.name));
    details.commands.sort_by(|a, b| a.name.cmp(&b.name));
    details.mcps.sort_by(|a, b| a.name.cmp(&b.name));
    details.hooks.sort_by(|a, b| a.event.cmp(&b.event));
    details.agents.sort_by(|a, b| a.name.cmp(&b.name));
    details.lsp_servers.sort_by(|a, b| a.language.cmp(&b.language));

    let counts = PluginComponents {
        skills: details.skills.len(),
        commands: details.commands.len(),
        mcps: details.mcps.len(),
        hooks: details.hooks.len(),
        agents: details.agents.len(),
        lsp_servers: details.lsp_servers.len(),
    };

    (counts, details)
}

// ===== Internal helper types for JSON parsing =====

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct McpJsonFile {
    #[serde(default)]
    mcp_servers: HashMap<String, McpServerEntry>,
}

#[derive(Deserialize)]
struct McpServerEntry {
    #[serde(default)]
    command: Option<String>,
    #[serde(default)]
    url: Option<String>,
}

#[derive(Deserialize)]
struct HookMatcherEntry {
    #[serde(default)]
    matcher: Option<String>,
    #[serde(default)]
    hooks: Vec<HookAction>,
}

#[derive(Deserialize)]
struct HookAction {
    #[serde(default)]
    command: Option<String>,
}

#[derive(Deserialize)]
struct LspEntry {
    command: String,
}

// ===== Frontmatter parsing helpers =====

/// Parse name and description from a command .md file's YAML frontmatter
fn parse_command_frontmatter(path: &Path) -> (String, Option<String>) {
    let fallback_name = path
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (fallback_name, None),
    };

    parse_yaml_frontmatter(&content, &fallback_name)
}

/// Parse name and description from an agent .md file's YAML frontmatter
fn parse_agent_frontmatter(path: &Path) -> (String, Option<String>) {
    let fallback_name = path
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (fallback_name, None),
    };

    parse_yaml_frontmatter(&content, &fallback_name)
}

/// Extract name and description from YAML frontmatter
fn parse_yaml_frontmatter(content: &str, fallback_name: &str) -> (String, Option<String>) {
    let content = content.trim();
    if !content.starts_with("---") {
        return (fallback_name.to_string(), None);
    }

    let after_delimiter = &content[3..];
    let end_pos = match after_delimiter.find("\n---") {
        Some(pos) => pos,
        None => return (fallback_name.to_string(), None),
    };

    let frontmatter = after_delimiter[..end_pos].trim();

    #[derive(Deserialize)]
    struct Frontmatter {
        #[serde(default)]
        name: Option<String>,
        #[serde(default)]
        description: Option<String>,
    }

    match serde_yaml::from_str::<Frontmatter>(frontmatter) {
        Ok(fm) => {
            let name = fm.name.unwrap_or_else(|| fallback_name.to_string());
            (name, fm.description)
        }
        Err(_) => (fallback_name.to_string(), None),
    }
}

// ===== Scanner functions =====

/// Scan Claude Code CLI plugins
fn scan_claude_cli_plugins(home_dir: &Path) -> Vec<PluginItem> {
    let mut plugins = Vec::new();
    let plugins_dir = home_dir.join(".claude").join("plugins");

    // Read installed_plugins.json
    let registry_path = plugins_dir.join("installed_plugins.json");
    let registry = match parse_installed_plugins_json(&registry_path) {
        Ok(r) => r,
        Err(_) => return plugins,
    };

    for (key, entries) in &registry.plugins {
        // key format: "plugin-name@marketplace"
        let marketplace_name = key.split('@').nth(1).map(|s| s.to_string());

        for entry in entries {
            let install_path = match &entry.install_path {
                Some(p) => p,
                None => continue,
            };

            // Resolve plugin directory relative to plugins_dir
            let plugin_dir = plugins_dir.join(install_path);
            if !plugin_dir.is_dir() {
                continue;
            }

            // Read manifest
            let manifest_path = plugin_dir.join(".claude-plugin").join("plugin.json");
            let (name, description, version, author) = if let Ok(manifest) =
                parse_plugin_json(&manifest_path)
            {
                (
                    manifest.name,
                    manifest.description.unwrap_or_default(),
                    manifest.version.unwrap_or_else(|| {
                        entry.version.clone().unwrap_or_else(|| "0.0.0".to_string())
                    }),
                    manifest.author.map(|a| a.name),
                )
            } else {
                // Fallback: derive name from key
                let name = key.split('@').next().unwrap_or(key).to_string();
                let version = entry.version.clone().unwrap_or_else(|| "0.0.0".to_string());
                (name, String::new(), version, None)
            };

            let scope = match entry.scope.as_deref() {
                Some("project") => PluginScope::Project,
                Some("managed") => PluginScope::Managed,
                Some("local") => PluginScope::Local,
                Some("system") => PluginScope::System,
                _ => PluginScope::User,
            };

            let (components, component_details) = inventory_components(&plugin_dir);

            // Read README
            let readme = read_readme(&plugin_dir);

            let path_str = plugin_dir.to_string_lossy().to_string();
            plugins.push(PluginItem {
                id: generate_plugin_id(&name, PluginSourceVariant::ClaudeCli, &path_str),
                name,
                description,
                version,
                author,
                source_tool: PluginSourceTool::Claude,
                source_variant: PluginSourceVariant::ClaudeCli,
                marketplace: marketplace_name.clone(),
                scope,
                enabled: true,
                path: path_str,
                installed_at: entry.installed_at.clone(),
                components,
                component_details,
                category: None,
                readme,
            });
        }
    }

    plugins
}

/// Scan Claude Desktop Cowork plugins
fn scan_cowork_plugins(home_dir: &Path) -> Vec<PluginItem> {
    let mut plugins = Vec::new();
    let sessions_dir = home_dir
        .join("Library")
        .join("Application Support")
        .join("Claude")
        .join("local-agent-mode-sessions");

    if !sessions_dir.is_dir() {
        return plugins;
    }

    // Scan all org UUIDs under local-agent-mode-sessions
    let org_dirs = match std::fs::read_dir(&sessions_dir) {
        Ok(entries) => entries,
        Err(_) => return plugins,
    };

    for org_entry in org_dirs.flatten() {
        let org_dir = org_entry.path();
        if !org_dir.is_dir() {
            continue;
        }

        let org_name = org_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip skills-plugin (handled separately)
        if org_name == "skills-plugin" {
            scan_cowork_skills_plugin(&org_dir, &mut plugins);
            continue;
        }

        // Scan cowork_plugins directory within each org
        let cowork_plugins_dir = org_dir.join("cowork_plugins");
        if !cowork_plugins_dir.is_dir() {
            continue;
        }

        // Read installed_plugins.json
        let registry_path = cowork_plugins_dir.join("installed_plugins.json");
        let registry = match parse_installed_plugins_json(&registry_path) {
            Ok(r) => r,
            Err(_) => continue,
        };

        for (key, entries) in &registry.plugins {
            let marketplace_name = key.split('@').nth(1).map(|s| s.to_string());

            for entry in entries {
                let install_path = match &entry.install_path {
                    Some(p) => p,
                    None => continue,
                };

                // Cowork paths use mnt/.claude/cowork_plugins/cache/... — strip the prefix
                let resolved_path = if install_path.starts_with("mnt/.claude/cowork_plugins/") {
                    let stripped = install_path
                        .strip_prefix("mnt/.claude/cowork_plugins/")
                        .unwrap_or(install_path);
                    cowork_plugins_dir.join(stripped)
                } else if install_path.starts_with("mnt/.claude/") {
                    let stripped = install_path
                        .strip_prefix("mnt/.claude/")
                        .unwrap_or(install_path);
                    cowork_plugins_dir.parent().unwrap_or(&org_dir).join(stripped)
                } else {
                    cowork_plugins_dir.join(install_path)
                };

                if !resolved_path.is_dir() {
                    continue;
                }

                let manifest_path = resolved_path.join(".claude-plugin").join("plugin.json");
                let (name, description, version, author) =
                    if let Ok(manifest) = parse_plugin_json(&manifest_path) {
                        (
                            manifest.name,
                            manifest.description.unwrap_or_default(),
                            manifest.version.unwrap_or_else(|| {
                                entry.version.clone().unwrap_or_else(|| "0.0.0".to_string())
                            }),
                            manifest.author.map(|a| a.name),
                        )
                    } else {
                        let name = key.split('@').next().unwrap_or(key).to_string();
                        let version =
                            entry.version.clone().unwrap_or_else(|| "0.0.0".to_string());
                        (name, String::new(), version, None)
                    };

                let scope = match entry.scope.as_deref() {
                    Some("project") => PluginScope::Project,
                    Some("managed") => PluginScope::Managed,
                    Some("system") => PluginScope::System,
                    _ => PluginScope::User,
                };

                let (components, component_details) = inventory_components(&resolved_path);
                let readme = read_readme(&resolved_path);

                let path_str = resolved_path.to_string_lossy().to_string();
                plugins.push(PluginItem {
                    id: generate_plugin_id(&name, PluginSourceVariant::ClaudeDesktop, &path_str),
                    name,
                    description,
                    version,
                    author,
                    source_tool: PluginSourceTool::Claude,
                    source_variant: PluginSourceVariant::ClaudeDesktop,
                    marketplace: marketplace_name.clone(),
                    scope,
                    enabled: true,
                    path: path_str,
                    installed_at: entry.installed_at.clone(),
                    components,
                    component_details,
                    category: None,
                    readme,
                });
            }
        }
    }

    plugins
}

/// Scan the built-in Anthropic skills plugin from Cowork's skills-plugin directory
fn scan_cowork_skills_plugin(skills_plugin_dir: &Path, plugins: &mut Vec<PluginItem>) {
    if !skills_plugin_dir.is_dir() {
        return;
    }

    // skills-plugin/<uuid>/ directories
    let uuid_dirs = match std::fs::read_dir(skills_plugin_dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for uuid_entry in uuid_dirs.flatten() {
        let uuid_dir = uuid_entry.path();
        if !uuid_dir.is_dir() {
            continue;
        }

        // Check for plugin.json manifest
        let manifest_path = uuid_dir.join(".claude-plugin").join("plugin.json");
        let (name, description, version, author) =
            if let Ok(manifest) = parse_plugin_json(&manifest_path) {
                (
                    manifest.name,
                    manifest.description.unwrap_or_default(),
                    manifest.version.unwrap_or_else(|| "0.0.0".to_string()),
                    manifest.author.map(|a| a.name),
                )
            } else {
                ("anthropic-skills".to_string(), "Built-in Anthropic skills".to_string(), "0.0.0".to_string(), Some("Anthropic".to_string()))
            };

        let (components, component_details) = inventory_components(&uuid_dir);
        let readme = read_readme(&uuid_dir);

        let path_str = uuid_dir.to_string_lossy().to_string();
        plugins.push(PluginItem {
            id: generate_plugin_id(&name, PluginSourceVariant::ClaudeDesktop, &path_str),
            name,
            description,
            version,
            author,
            source_tool: PluginSourceTool::Claude,
            source_variant: PluginSourceVariant::ClaudeDesktop,
            marketplace: None,
            scope: PluginScope::System,
            enabled: true,
            path: path_str,
            installed_at: None,
            components,
            component_details,
            category: None,
            readme,
        });
    }
}

/// Scan Gemini CLI extensions
fn scan_gemini_extensions(home_dir: &Path) -> Vec<PluginItem> {
    let mut plugins = Vec::new();
    let extensions_dir = home_dir.join(".gemini").join("extensions");

    if !extensions_dir.is_dir() {
        return plugins;
    }

    let entries = match std::fs::read_dir(&extensions_dir) {
        Ok(e) => e,
        Err(_) => return plugins,
    };

    for entry in entries.flatten() {
        let ext_dir = entry.path();
        if !ext_dir.is_dir() {
            continue;
        }

        let manifest_path = ext_dir.join("gemini-extension.json");
        if !manifest_path.exists() {
            continue;
        }

        let manifest = match parse_gemini_extension_json(&manifest_path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        // Build MCP info from the manifest's mcpServers
        let mut mcp_details: Vec<PluginMCPInfo> = manifest
            .mcp_servers
            .iter()
            .map(|(name, server)| {
                let mcp_type = if server.url.is_some() {
                    "http".to_string()
                } else {
                    "stdio".to_string()
                };
                PluginMCPInfo {
                    name: name.clone(),
                    mcp_type,
                    url: server.url.clone(),
                    command: server.command.clone(),
                }
            })
            .collect();
        mcp_details.sort_by(|a, b| a.name.cmp(&b.name));

        // Also inventory the file-based components
        let (mut components, mut component_details) = inventory_components(&ext_dir);

        // Merge MCP info from manifest (these are authoritative for Gemini extensions)
        if !mcp_details.is_empty() {
            component_details.mcps = mcp_details;
            components.mcps = component_details.mcps.len();
        }

        let readme = read_readme(&ext_dir);

        let path_str = ext_dir.to_string_lossy().to_string();
        plugins.push(PluginItem {
            id: generate_plugin_id(&manifest.name, PluginSourceVariant::GeminiCli, &path_str),
            name: manifest.name,
            description: manifest.description.unwrap_or_default(),
            version: manifest.version.unwrap_or_else(|| "0.0.0".to_string()),
            author: None,
            source_tool: PluginSourceTool::Gemini,
            source_variant: PluginSourceVariant::GeminiCli,
            marketplace: None,
            scope: PluginScope::User,
            enabled: true,
            path: path_str,
            installed_at: None,
            components,
            component_details,
            category: None,
            readme,
        });
    }

    plugins
}

/// Scan marketplace catalogs for available plugins
fn scan_marketplace_catalogs(
    home_dir: &Path,
    installed_keys: &HashSet<(PluginSourceTool, String)>,
) -> (Vec<MarketplacePluginItem>, Vec<MarketplaceInfo>) {
    let mut available = Vec::new();
    let mut marketplaces = Vec::new();

    // Claude Code CLI marketplaces
    let cli_marketplaces_dir = home_dir
        .join(".claude")
        .join("plugins")
        .join("marketplaces");
    if cli_marketplaces_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&cli_marketplaces_dir) {
            for entry in entries.flatten() {
                let marketplace_dir = entry.path();
                if !marketplace_dir.is_dir() {
                    continue;
                }

                let catalog_path = marketplace_dir
                    .join(".claude-plugin")
                    .join("marketplace.json");
                if let Ok(catalog) = parse_marketplace_json(&catalog_path) {
                    marketplaces.push(MarketplaceInfo {
                        name: catalog.name.clone(),
                        source: marketplace_dir.to_string_lossy().to_string(),
                        source_variant: PluginSourceVariant::ClaudeCli,
                        last_updated: None,
                    });

                    for plugin in &catalog.plugins {
                        let is_installed = installed_keys
                            .contains(&(PluginSourceTool::Claude, plugin.name.clone()));
                        available.push(MarketplacePluginItem {
                            name: plugin.name.clone(),
                            description: plugin.description.clone().unwrap_or_default(),
                            version: plugin.version.clone().unwrap_or_default(),
                            author: plugin.author.as_ref().map(|a| a.name.clone()),
                            category: plugin.category.clone(),
                            marketplace: catalog.name.clone(),
                            is_installed,
                            source_variant: PluginSourceVariant::ClaudeCli,
                        });
                    }
                }
            }
        }
    }

    // Cowork marketplaces (similar path structure)
    let sessions_dir = home_dir
        .join("Library")
        .join("Application Support")
        .join("Claude")
        .join("local-agent-mode-sessions");

    if sessions_dir.is_dir() {
        if let Ok(org_dirs) = std::fs::read_dir(&sessions_dir) {
            for org_entry in org_dirs.flatten() {
                let org_dir = org_entry.path();
                let marketplaces_dir = org_dir.join("cowork_plugins").join("marketplaces");
                if !marketplaces_dir.is_dir() {
                    continue;
                }

                if let Ok(entries) = std::fs::read_dir(&marketplaces_dir) {
                    for entry in entries.flatten() {
                        let marketplace_dir = entry.path();
                        if !marketplace_dir.is_dir() {
                            continue;
                        }

                        let catalog_path = marketplace_dir
                            .join(".claude-plugin")
                            .join("marketplace.json");
                        if let Ok(catalog) = parse_marketplace_json(&catalog_path) {
                            // Only add marketplace metadata once (dedup)
                            let already_registered = marketplaces
                                .iter()
                                .any(|m| m.name == catalog.name);
                            if !already_registered {
                                marketplaces.push(MarketplaceInfo {
                                    name: catalog.name.clone(),
                                    source: marketplace_dir.to_string_lossy().to_string(),
                                    source_variant: PluginSourceVariant::ClaudeDesktop,
                                    last_updated: None,
                                });
                            }

                            // Always merge plugin entries, deduplicating by name within marketplace
                            for plugin in &catalog.plugins {
                                let already_listed = available.iter().any(|a| {
                                    a.marketplace == catalog.name && a.name == plugin.name
                                });
                                if already_listed {
                                    continue;
                                }
                                let is_installed = installed_keys
                                    .contains(&(PluginSourceTool::Claude, plugin.name.clone()));
                                available.push(MarketplacePluginItem {
                                    name: plugin.name.clone(),
                                    description: plugin
                                        .description
                                        .clone()
                                        .unwrap_or_default(),
                                    version: plugin.version.clone().unwrap_or_default(),
                                    author: plugin.author.as_ref().map(|a| a.name.clone()),
                                    category: plugin.category.clone(),
                                    marketplace: catalog.name.clone(),
                                    is_installed,
                                    source_variant: PluginSourceVariant::ClaudeDesktop,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    (available, marketplaces)
}

/// Read README.md if present
fn read_readme(plugin_dir: &Path) -> Option<String> {
    let readme_path = plugin_dir.join("README.md");
    if readme_path.exists() {
        std::fs::read_to_string(&readme_path).ok()
    } else {
        None
    }
}

// ===== Main entry point =====

/// Scan all plugins across Claude Code CLI, Claude Desktop Cowork, and Gemini CLI
pub fn scan_all_plugins(_workspace_path: Option<&str>) -> Result<PluginScanResult, String> {
    let home_dir =
        crate::helpers::effective_home().ok_or("Could not determine home directory")?;

    let mut installed: Vec<PluginItem> = Vec::new();

    // 1. Claude Code CLI plugins
    installed.extend(scan_claude_cli_plugins(&home_dir));

    // 2. Claude Desktop Cowork plugins
    installed.extend(scan_cowork_plugins(&home_dir));

    // 3. Gemini CLI extensions
    installed.extend(scan_gemini_extensions(&home_dir));

    // Build set of installed plugin (source_tool, name) pairs for cross-referencing.
    // This prevents a Gemini extension name from falsely marking a Claude marketplace
    // plugin as installed (or vice versa).
    let installed_keys: HashSet<(PluginSourceTool, String)> = installed
        .iter()
        .map(|p| (p.source_tool, p.name.clone()))
        .collect();

    // 4. Marketplace catalogs
    let (available, marketplaces) = scan_marketplace_catalogs(&home_dir, &installed_keys);

    // Sort installed by name, then source variant
    installed.sort_by(|a, b| {
        a.name
            .cmp(&b.name)
            .then_with(|| format!("{:?}", a.source_variant).cmp(&format!("{:?}", b.source_variant)))
    });

    Ok(PluginScanResult {
        installed,
        available,
        marketplaces,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_plugin_id() {
        let id1 = generate_plugin_id("test", PluginSourceVariant::ClaudeCli, "/path/a");
        let id2 = generate_plugin_id("test", PluginSourceVariant::GeminiCli, "/path/b");
        let id3 = generate_plugin_id("test", PluginSourceVariant::ClaudeCli, "/path/b");
        assert!(id1.starts_with("plugin_"));
        assert_ne!(id1, id2); // Different variants produce different IDs
        assert_ne!(id1, id3); // Different paths produce different IDs
    }

    #[test]
    fn test_parse_yaml_frontmatter_valid() {
        let content = "---\nname: test-cmd\ndescription: A test command\n---\n\nBody content";
        let (name, desc) = parse_yaml_frontmatter(content, "fallback");
        assert_eq!(name, "test-cmd");
        assert_eq!(desc, Some("A test command".to_string()));
    }

    #[test]
    fn test_parse_yaml_frontmatter_no_frontmatter() {
        let content = "Just a plain markdown file";
        let (name, desc) = parse_yaml_frontmatter(content, "fallback");
        assert_eq!(name, "fallback");
        assert!(desc.is_none());
    }

    #[test]
    fn test_parse_yaml_frontmatter_unclosed() {
        let content = "---\nname: broken\ndescription: Missing closing";
        let (name, desc) = parse_yaml_frontmatter(content, "fallback");
        assert_eq!(name, "fallback");
        assert!(desc.is_none());
    }
}
