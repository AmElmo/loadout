import {
  GitCommit,
  GitBranch,
  GitMerge,
  Code,
  Bug,
  FlaskConical,
  Hammer,
  Rocket,
  Recycle,
  AlignLeft,
  Eye,
  BarChart3,
  Shield,
  Search,
  FileText,
  PenTool,
  Languages,
  Plug,
  Database,
  ArrowRightLeft,
  Container,
  Activity,
  Settings,
  Mail,
  MessageSquare,
  MessageCircle,
  Brain,
  Workflow,
  Wand2,
  Compass,
  CheckSquare,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IconEntry = {
  keywords: string[];
  icon: string; // Lucide icon name
};

// Order matters — first match wins.
export const SKILL_ICON_MAP: IconEntry[] = [
  // Version control
  { keywords: ["commit", "git"], icon: "GitCommit" },
  { keywords: ["branch"], icon: "GitBranch" },
  { keywords: ["merge", "pull-request"], icon: "GitMerge" },

  // Code & development
  { keywords: ["code", "coding"], icon: "Code" },
  { keywords: ["debug", "bug"], icon: "Bug" },
  { keywords: ["test", "spec", "jest", "vitest"], icon: "FlaskConical" },
  { keywords: ["build", "compile"], icon: "Hammer" },
  { keywords: ["deploy", "ship", "release"], icon: "Rocket" },
  { keywords: ["refactor", "clean"], icon: "Recycle" },
  { keywords: ["lint", "format"], icon: "AlignLeft" },

  // Review & analysis
  { keywords: ["review"], icon: "Eye" },
  { keywords: ["analyze", "analysis"], icon: "BarChart3" },
  { keywords: ["audit", "security"], icon: "Shield" },
  { keywords: ["search", "find", "explore"], icon: "Search" },

  // Documentation
  { keywords: ["doc", "docs", "document", "readme"], icon: "FileText" },
  { keywords: ["write", "draft", "blog"], icon: "PenTool" },
  { keywords: ["translate", "i18n", "locale"], icon: "Languages" },

  // Data & API
  { keywords: ["api", "endpoint", "rest", "graphql"], icon: "Plug" },
  { keywords: ["database", "sql", "migration"], icon: "Database" },
  { keywords: ["data", "transform", "etl"], icon: "ArrowRightLeft" },

  // Infrastructure
  { keywords: ["docker", "container"], icon: "Container" },
  { keywords: ["monitor", "alert", "observe"], icon: "Activity" },
  { keywords: ["config", "setting", "env"], icon: "Settings" },

  // Communication
  { keywords: ["email", "mail", "notify"], icon: "Mail" },
  { keywords: ["chat", "message", "slack"], icon: "MessageSquare" },
  { keywords: ["comment", "feedback"], icon: "MessageCircle" },

  // AI & automation
  { keywords: ["llm", "agent", "prompt"], icon: "Brain" },
  { keywords: ["automate", "workflow", "pipeline"], icon: "Workflow" },
  { keywords: ["generate", "create", "scaffold"], icon: "Wand2" },

  // Planning
  { keywords: ["plan", "design", "architect"], icon: "Compass" },
  { keywords: ["task", "todo", "ticket"], icon: "CheckSquare" },
  { keywords: ["schedule", "calendar", "cron"], icon: "Calendar" },
];

// Direct imports only — no wildcard `icons` import
export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  GitCommit,
  GitBranch,
  GitMerge,
  Code,
  Bug,
  FlaskConical,
  Hammer,
  Rocket,
  Recycle,
  AlignLeft,
  Eye,
  BarChart3,
  Shield,
  Search,
  FileText,
  PenTool,
  Languages,
  Plug,
  Database,
  ArrowRightLeft,
  Container,
  Activity,
  Settings,
  Mail,
  MessageSquare,
  MessageCircle,
  Brain,
  Workflow,
  Wand2,
  Compass,
  CheckSquare,
  Calendar,
};

/**
 * Match a skill name against the keyword dictionary.
 * Uses whole-token matching only (no substring matching).
 * Returns the Lucide icon name or null if no match.
 */
export function matchSkillIcon(name: string): string | null {
  const tokens = new Set(name.toLowerCase().split(/[-_\s]+/));

  for (const entry of SKILL_ICON_MAP) {
    for (const keyword of entry.keywords) {
      // Multi-word keywords (e.g., "pull-request") → all parts must be present as tokens
      const keywordParts = keyword.split("-");
      if (keywordParts.every((part) => tokens.has(part))) {
        return entry.icon;
      }
    }
  }
  return null;
}
