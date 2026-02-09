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

export type SourceTool = "claude" | "codex" | "gemini";

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
  /** True if this skill is shadowed by a higher-precedence skill */
  isShadowed: boolean;
  /** Path of the skill that shadows this one */
  shadowedBy: string | null;
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
 * Result of scanning all skills
 */
export interface SkillScanResult {
  /** All discovered skills */
  skills: SkillItem[];
  /** Detected conflicts (same name, different content) */
  conflicts: SkillConflict[];
}

// === Rules & Hooks Types ===

export type PromptScope = "global" | "project";

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
}

export interface PromptScanResult {
  prompts: PromptFile[];
}

export type HookSourceTool = "claude" | "gemini";

/**
 * A normalized hook configuration item
 */
export interface HookItem {
  sourceTool: HookSourceTool;
  event: string;
  matcher: string | null;
  command: string;
  actionType: string;
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
