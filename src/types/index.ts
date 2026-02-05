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
 * Skill configuration (normalized)
 */
export interface Skill {
  name: string;
  description: string;
  content: string;
  sourceTool: SourceTool;
  scope: Scope;
  path: string;
  maturity: Maturity;
}
