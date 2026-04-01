/**
 * Core types for Loadout
 * Based on the LoadoutItem data model from the spec
 */

export type LoadoutItemType =
  | "skill"
  | "mcp"
  | "hook"
  | "command"
  | "agent"
  | "prompt"
  | "plugin";

export type SourceTool =
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "copilot"
  | "windsurf"
  | "roo"
  | "cline"
  | "kilo"
  | "opencode";

export type Scope = "user" | "repo" | "admin" | "system" | "project";

export type HealthStatus = "healthy" | "unknown" | "failed";

export type MCPType = "stdio" | "http";

export type Maturity = "stable" | "experimental" | "deprecated";

/**
 * Normalized representation of any config item across tools.
 * This is the single abstraction that the frontend renders
 * regardless of source tool or config format.
 */
export interface LoadoutItem {
  /** Unique hash */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of configuration item */
  type: LoadoutItemType;
  /** Which tool this came from */
  sourceTool: SourceTool;
  /** Scope level (user, repo, admin, system) */
  scope: Scope;
  /** Feature maturity level */
  maturity: Maturity;
  /** Absolute path on disk */
  path: string;
  /** Is this item currently functional? */
  isActive: boolean;
  /** Reasons it's inactive (e.g., "experiments.agentSkills is false") */
  blockers: string[];
  /** Original parsed config for inspection */
  raw: unknown;
}

/**
 * Workspace info returned from the backend
 */
export interface WorkspaceInfo {
  path: string;
  repo_root: string | null;
  name: string;
}

/**
 * MCP Server configuration (normalized) - legacy type
 * @deprecated Use MCPItem instead
 */
export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  sourceTool: SourceTool;
  scope: Scope;
  path: string;
}

/**
 * MCP item returned from the scanner
 * Matches the Rust MCPItem struct
 */
export interface MCPItem {
  /** Unique identifier */
  id: string;
  /** Server name */
  name: string;
  /** MCP type: stdio or http */
  mcpType: MCPType;
  /** Command to run (for stdio type) */
  command: string | null;
  /** Command arguments (for stdio type) */
  args: string[];
  /** URL endpoint (for http type) */
  url: string | null;
  /** Environment variables (values masked) */
  env: Record<string, string>;
  /** HTTP headers (for http type, values masked) */
  headers: Record<string, string>;
  /** Which tools this MCP is configured in */
  configuredIn: SourceTool[];
  /** Scope (user or project level) */
  scope: Scope;
  /** Path to the config file */
  path: string;
  /** Health status (default: unknown) */
  health: HealthStatus;
}

/**
 * Skill scope (user or project level)
 */
export type SkillScope = "user" | "project";

/**
 * Skill item returned from the scanner
 * Matches the Rust SkillItem struct
 */
export interface SkillItem {
  /** Unique identifier */
  id: string;
  /** Skill name from frontmatter */
  name: string;
  /** Skill description from frontmatter */
  description: string;
  /** Full markdown content */
  content: string;
  /** Which tool this skill is from */
  sourceTool: SourceTool;
  /** Scope level (user or project) */
  scope: SkillScope;
  /** Feature maturity (stable or experimental) */
  maturity: Maturity;
  /** Absolute path to the SKILL.md file */
  path: string;
  /** Estimated tokens when idle (just name + description in skill listing) */
  idleTokens: number;
  /** Estimated tokens when actively invoked (full content) */
  activeTokens: number;
  /** True if this skill is shadowed by a higher-precedence skill */
  isShadowed: boolean;
  /** Path of the skill that shadows this one */
  shadowedBy: string | null;
  /** True if the skill directory is a symlink */
  isSymlinked: boolean;
  /** Resolved target path if the skill directory is a symlink */
  symlinkTarget: string | null;
  /** True if the skill directory is a broken symlink */
  isBrokenSymlink: boolean;
}

/**
 * Skills grouped by name + scope across multiple tools
 */
export interface GroupedSkill {
  groupKey: string;
  name: string;
  description: string;
  scope: SkillScope;
  maturity: Maturity;
  installedTools: SourceTool[];
  primary: SkillItem;
  variants: SkillItem[];
  hasContentDrift: boolean;
}

/**
 * Conflict information when same skill name has different content
 */
export interface SkillConflict {
  /** Skill name that has conflicts */
  name: string;
  /** Paths of skills with different content */
  conflictingPaths: string[];
  /** Tools that have this conflict */
  tools: SourceTool[];
}

/**
 * A single version of a skill for conflict resolution comparison
 */
export interface SkillVersion {
  /** Which tool this version is from */
  sourceTool: SourceTool;
  /** Scope level (user or project) */
  scope: string;
  /** Absolute path to the skill file */
  path: string;
  /** Full file content */
  content: string;
  /** ISO 8601 timestamp of last modification */
  lastModified: string | null;
}

/**
 * Result of scanning all skills
 */
export interface SkillScanResult {
  /** All discovered skills */
  skills: SkillItem[];
  /** Detected conflicts (same name, different content) */
  conflicts: SkillConflict[];
}

/**
 * Result of an MCP health test
 */
export interface HealthTestResult {
  status: HealthStatus;
  message: string;
}

// === Rules & Hooks Types ===

export type PromptScope = "user" | "project";

/**
 * A discovered system prompt file
 */
export interface PromptFile {
  name: string;
  sourceTool: SourceTool;
  scope: PromptScope;
  path: string;
  exists: boolean;
  content: string;
  size: number;
  /** Estimated token count for context window usage */
  tokens: number;
  /** Glob patterns that scope this rule. Undefined = always loaded. */
  scopedPaths?: string[];
  /** Whether this rule is conditionally scoped (true) or always loaded (false). */
  isScoped: boolean;
}

export interface PromptScanResult {
  prompts: PromptFile[];
}

export type HookSourceTool = "claude" | "gemini" | "cursor" | "copilot" | "windsurf" | "cline";

export type HookScope = "user" | "project";

/**
 * A normalized hook configuration item
 */
export interface HookItem {
  sourceTool: HookSourceTool;
  scope: HookScope;
  event: string;
  matcher: string | null;
  command: string;
  actionType: string;
  path: string;
}

export interface HookScanResult {
  hooks: HookItem[];
  geminiHooksEnabled: boolean;
}

// === Workspace Discovery Types ===

/**
 * Signals found in a discovered workspace
 */
export interface WorkspaceSignals {
  hasClaudeConfig: boolean;
  hasCodexConfig: boolean;
  hasGeminiConfig: boolean;
  hasMcpJson: boolean;
  hasClaudePrompt: boolean;
  hasCodexPrompt: boolean;
  hasGeminiPrompt: boolean;
  hasClaudeSkills: boolean;
  hasCodexSkills: boolean;
  hasGeminiSkills: boolean;
  hasCursorConfig: boolean;
  hasCursorRules: boolean;
  hasCursorMcps: boolean;
  hasCopilotConfig: boolean;
  hasCopilotRules: boolean;
  hasWindsurfConfig: boolean;
  hasWindsurfRules: boolean;
  hasRooConfig: boolean;
  hasRooRules: boolean;
  hasClineConfig: boolean;
  hasClineRules: boolean;
  hasKiloConfig: boolean;
  hasKiloRules: boolean;
  hasOpenCodeConfig: boolean;
  hasOpenCodeRules: boolean;
}

/**
 * A workspace discovered by the scanner
 */
export interface DiscoveredWorkspace {
  path: string;
  name: string;
  isGitRepo: boolean;
  signals: WorkspaceSignals;
  toolCount: number;
}

/**
 * Result of workspace discovery scan
 */
export interface DiscoveryResult {
  workspaces: DiscoveredWorkspace[];
  scanDepth: number;
  scanDurationMs: number;
}

// === Sync / Write Types ===

/**
 * Request to add an MCP to one or more tools
 */
export interface AddMCPRequest {
  name: string;
  mcpType: MCPType;
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
  targetTools: SourceTool[];
}

/**
 * Request to sync an existing MCP from one tool to others
 */
export interface SyncMCPRequest {
  name: string;
  sourceTool: SourceTool;
  sourcePath?: string | null;
  targetTools: SourceTool[];
}

/**
 * A companion file within a skill directory
 */
export interface SkillFile {
  relativePath: string;
  content: string;
  size: number;
}

/**
 * Install method for skills
 */
export type InstallMethod = "link" | "copy";

export interface ExistingToolInfo {
  tool: SourceTool;
  method: InstallMethod;
}

/**
 * Request to install a skill to one or more tools
 */
export interface InstallSkillRequest {
  name: string;
  content: string;
  targetTools: SourceTool[];
  /** Install method: "link" (symlink from canonical) or "copy" (independent copies) */
  method: InstallMethod;
  files: SkillFile[];
}

/**
 * A skill fetched from a URL or parsed from file content
 */
export interface FetchedSkill {
  name: string;
  description: string;
  content: string;
  sourceUrl: string | null;
  files: SkillFile[];
}

/**
 * Result of a write operation
 */
export interface WriteResult {
  success: boolean;
  modifiedFiles: string[];
  errors: string[];
  /** Install method used: "link" or "copy" */
  method: InstallMethod;
  /** Path to the canonical skill directory (for link mode) */
  canonicalPath: string | null;
  /** True if symlink creation failed and fell back to copy */
  symlinkFailed: boolean;
}

/**
 * Request to remove an MCP from one or more tools
 */
export interface RemoveMCPRequest {
  name: string;
  targetTools: SourceTool[];
}

/**
 * Request to remove a skill from one or more tools
 */
export interface RemoveSkillRequest {
  name: string;
  targetTools: SourceTool[];
  /** Whether to also remove the canonical copy in ~/.agents/skills/ */
  removeCanonical: boolean;
}

/**
 * Request to remove an agent from one or more tools
 */
export interface RemoveAgentRequest {
  filename: string;
  targetTools: AgentSourceTool[];
  scope: AgentScope;
  workspacePath?: string;
}

/**
 * Result of a remove operation
 */
export interface RemoveResult {
  success: boolean;
  removedFiles: string[];
  errors: string[];
}

/**
 * Preview of a generated config for a single tool
 */
export interface PreviewConfig {
  tool: SourceTool;
  format: "json" | "toml";
  content: string;
}

/**
 * Result of preview generation
 */
export interface PreviewResult {
  configs: PreviewConfig[];
}

// === Context Window / Token Types ===

/**
 * Information about a single MCP tool definition
 */
export interface MCPToolInfo {
  name: string;
  description: string | null;
  /** Estimated tokens for this tool's definition */
  tokens: number;
}

/**
 * Result of fetching MCP tool definitions via tools/list
 */
export interface MCPToolsResult {
  toolCount: number;
  /** Total estimated idle tokens (all tool definitions) */
  idleTokens: number;
  tools: MCPToolInfo[];
}

// === Repo Scan Types ===

/**
 * A git repo that has no AI rules files
 */
export interface RepoWithoutRules {
  /** Absolute path to the repo root */
  path: string;
  /** Short name (last path component) */
  name: string;
  /** ISO 8601 date of the most recent commit */
  lastCommitDate: string | null;
  /** First line of the most recent commit message */
  lastCommitMessage: string | null;
  /** Author of the most recent commit */
  lastCommitAuthor: string | null;
  /** Approximate commit count */
  commitCount: number | null;
  /** Current branch name */
  currentBranch: string | null;
}

/**
 * Result of scanning repos for missing rules
 */
export interface RepoScanResult {
  repos: RepoWithoutRules[];
  totalReposScanned: number;
  reposWithRules: number;
  reposWithoutRules: number;
  scanDurationMs: number;
}

// === Agent Types ===

export type AgentSourceTool = "claude" | "gemini";

export type AgentScope = "user" | "project";

export type AgentMaturity = "stable" | "experimental";

/**
 * Agent item returned from the scanner
 * Matches the Rust AgentItem struct
 */
export interface AgentItem {
  /** Unique identifier */
  id: string;
  /** Agent name from frontmatter or filename */
  name: string;
  /** Agent description */
  description: string;
  /** Full markdown content (body after frontmatter) */
  content: string;
  /** Allowed tools (comma-separated in frontmatter) */
  tools: string | null;
  /** Model override */
  model: string | null;
  /** Max agentic turns */
  maxTurns: number | null;
  /** Permission mode */
  permissionMode: string | null;
  /** Which tool this agent is from */
  sourceTool: AgentSourceTool;
  /** Scope level (user or project) */
  scope: AgentScope;
  /** Feature maturity (stable or experimental) */
  maturity: AgentMaturity;
  /** Absolute path to the agent .md file */
  path: string;
  /** True if shadowed by a higher-precedence agent */
  isShadowed: boolean;
  /** Path of the agent that shadows this one */
  shadowedBy: string | null;
  /** Which tools this agent is configured in (for merged view) */
  configuredIn: AgentSourceTool[];
}

/**
 * Agents grouped by name + scope across multiple tools
 */
export interface GroupedAgent {
  groupKey: string;
  name: string;
  description: string;
  scope: AgentScope;
  maturity: AgentMaturity;
  tools: string | null;
  model: string | null;
  maxTurns: number | null;
  permissionMode: string | null;
  installedTools: AgentSourceTool[];
  primary: AgentItem;
  variants: AgentItem[];
  hasContentDrift: boolean;
}

/**
 * Conflict information when same agent name has different content
 */
export interface AgentConflict {
  /** Agent name that has conflicts */
  name: string;
  /** Paths of agents with different content */
  conflictingPaths: string[];
  /** Tools that have this conflict */
  tools: AgentSourceTool[];
}

/**
 * Result of scanning all agents
 */
export interface AgentScanResult {
  /** All discovered agents */
  agents: AgentItem[];
  /** Detected conflicts (same name, different content) */
  conflicts: AgentConflict[];
  /** Whether Gemini has enableAgents: true */
  geminiAgentsEnabled: boolean;
}

/**
 * Request to install a new agent to one or more tools
 */
export interface InstallAgentRequest {
  /** Filename (without .md extension) */
  filename: string;
  /** Full file content (frontmatter + body) */
  content: string;
  /** Scope: user-level or project-level */
  scope: AgentScope;
  /** Target tools to install to */
  targetTools: AgentSourceTool[];
  /** Workspace path (required for project scope) */
  workspacePath?: string;
}

/**
 * Request to sync an existing agent to other tools
 */
export interface SyncAgentRequest {
  /** Agent filename (without .md extension) */
  filename: string;
  /** Source tool */
  sourceTool: AgentSourceTool;
  /** Source file path */
  sourcePath: string;
  /** Target tools to sync to */
  targetTools: AgentSourceTool[];
  /** Scope */
  scope: AgentScope;
  /** Workspace path (required for project scope) */
  workspacePath?: string;
}

/**
 * Result of an agent write operation
 */
export interface AgentWriteResult {
  success: boolean;
  modifiedFiles: string[];
  errors: string[];
}

/**
 * An agent fetched from a URL or parsed from file content
 */
export interface FetchedAgent {
  name: string;
  description: string;
  /** Full raw file content (frontmatter + body) */
  content: string;
  tools: string | null;
  model: string | null;
  maxTurns: number | null;
  permissionMode: string | null;
  sourceUrl: string | null;
}

// === Plugin Types ===

export type PluginSourceTool = "claude" | "gemini";

export type PluginSourceVariant = "claude-cli" | "claude-desktop" | "gemini-cli";

export type PluginScope = "user" | "project" | "local" | "managed" | "system";

export interface PluginSkillInfo {
  name: string;
  description: string | null;
  content: string | null;
}

export interface PluginCommandInfo {
  name: string;
  description: string | null;
}

export interface PluginMCPInfo {
  name: string;
  mcpType: string;
  url: string | null;
  command: string | null;
}

export interface PluginHookInfo {
  event: string;
  matcher: string | null;
  command: string;
}

export interface PluginAgentInfo {
  name: string;
  description: string | null;
}

export interface PluginLSPInfo {
  language: string;
  command: string;
}

export interface PluginComponents {
  skills: number;
  commands: number;
  mcps: number;
  hooks: number;
  agents: number;
  lspServers: number;
}

export interface PluginComponentDetails {
  skills: PluginSkillInfo[];
  commands: PluginCommandInfo[];
  mcps: PluginMCPInfo[];
  hooks: PluginHookInfo[];
  agents: PluginAgentInfo[];
  lspServers: PluginLSPInfo[];
}

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string | null;
  sourceTool: PluginSourceTool;
  sourceVariant: PluginSourceVariant;
  marketplace: string | null;
  scope: PluginScope;
  enabled: boolean;
  path: string;
  installedAt: string | null;
  components: PluginComponents;
  componentDetails: PluginComponentDetails;
  category: string | null;
  readme: string | null;
}

export interface MarketplacePluginItem {
  name: string;
  description: string;
  version: string;
  author: string | null;
  category: string | null;
  marketplace: string;
  isInstalled: boolean;
  sourceVariant: PluginSourceVariant;
}

export interface MarketplaceInfo {
  name: string;
  source: string;
  sourceVariant: PluginSourceVariant;
  lastUpdated: string | null;
}

export interface PluginScanResult {
  installed: PluginItem[];
  available: MarketplacePluginItem[];
  marketplaces: MarketplaceInfo[];
}
