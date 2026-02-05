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

export type Scope = "user" | "repo" | "admin" | "system";

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
 * MCP Server configuration (normalized)
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
