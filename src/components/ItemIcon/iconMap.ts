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
  Megaphone,
  Handshake,
  GraduationCap,
  Heart,
  Lightbulb,
  Scale,
  Tag,
  Users,
  Briefcase,
  BookOpen,
  Palette,
  Puzzle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { stemmer } from "stemmer";

type IconEntry = {
  keywords: string[];
  icon: string; // Lucide icon name
};

// Order matters — first match wins.
// Keywords are stemmed at load time, so "deploy" also matches "deploying", "deployment", etc.
export const ITEM_ICON_MAP: IconEntry[] = [
  // Version control
  { keywords: ["commit", "git"], icon: "GitCommit" },
  { keywords: ["branch"], icon: "GitBranch" },
  { keywords: ["merge", "pull-request"], icon: "GitMerge" },

  // Code & development
  { keywords: ["code", "coding"], icon: "Code" },
  { keywords: ["debug", "bug", "error"], icon: "Bug" },
  { keywords: ["test", "spec", "jest", "vitest", "verify"], icon: "FlaskConical" },
  { keywords: ["build", "compile"], icon: "Hammer" },
  { keywords: ["deploy", "ship", "release"], icon: "Rocket" },
  { keywords: ["refactor", "clean"], icon: "Recycle" },
  { keywords: ["lint", "format"], icon: "AlignLeft" },

  // Review & analysis
  { keywords: ["review"], icon: "Eye" },
  { keywords: ["analyze", "analysis", "evaluate", "assess"], icon: "BarChart3" },
  { keywords: ["audit", "security"], icon: "Shield" },
  { keywords: ["search", "find", "explore"], icon: "Search" },

  // Documentation & writing
  { keywords: ["doc", "docs", "document", "readme"], icon: "FileText" },
  { keywords: ["write", "draft", "blog", "copy", "content", "deslop"], icon: "PenTool" },
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
  { keywords: ["communicate", "present", "speak", "pitch"], icon: "Megaphone" },

  // AI & automation
  { keywords: ["llm", "agent", "prompt"], icon: "Brain" },
  { keywords: ["automate", "workflow", "pipeline"], icon: "Workflow" },

  // Planning & design
  { keywords: ["plan", "architect"], icon: "Compass" },
  { keywords: ["task", "todo", "ticket"], icon: "CheckSquare" },
  { keywords: ["schedule", "calendar", "cron"], icon: "Calendar" },
  { keywords: ["design", "brand", "identity", "logo"], icon: "Palette" },

  // Generation (after design/brand so more specific matches win)
  { keywords: ["generate", "create", "creator", "scaffold"], icon: "Wand2" },

  // Persuasion & negotiation
  { keywords: ["convince", "persuade", "negotiate", "influence"], icon: "Handshake" },

  // Learning & teaching
  { keywords: ["learn", "teach", "tutor", "study", "educate"], icon: "GraduationCap" },

  // Emotion & wellness
  { keywords: ["emotion", "regulate", "stress", "mindset", "therapy", "wellbeing"], icon: "Heart" },

  // Creativity & ideation
  { keywords: ["creative", "brainstorm", "ideate", "imagine"], icon: "Lightbulb" },

  // Thinking & judgment
  { keywords: ["think", "reason", "judge", "judgment", "decide", "decision", "critical"], icon: "Scale" },

  // Naming & tagging
  { keywords: ["name", "naming", "tag", "label"], icon: "Tag" },

  // Conflict resolution
  { keywords: ["conflict", "resolve", "mediate", "dispute"], icon: "Puzzle" },

  // People & team
  { keywords: ["hire", "interview", "team", "people", "collaborate"], icon: "Users" },

  // Reading & reference
  { keywords: ["read", "book", "reference", "knowledge"], icon: "BookOpen" },

  // Finance & business
  { keywords: ["finance", "budget", "revenue", "pricing", "business"], icon: "Briefcase" },

  // Problem solving (generic catch-all for "solve", "problem", "fix")
  { keywords: ["solve", "problem", "fix", "troubleshoot"], icon: "Puzzle" },

  // Action & productivity
  { keywords: ["action", "execute", "effective", "productive", "prioritize"], icon: "Rocket" },
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
  Megaphone,
  Handshake,
  GraduationCap,
  Heart,
  Lightbulb,
  Scale,
  Tag,
  Users,
  Briefcase,
  BookOpen,
  Palette,
  Puzzle,
};

// Pre-stem all keywords at module load for fast matching
type StemmedEntry = {
  stemmedKeywords: string[][]; // each keyword split into stemmed parts
  icon: string;
};

const STEMMED_MAP: StemmedEntry[] = ITEM_ICON_MAP.map((entry) => ({
  icon: entry.icon,
  stemmedKeywords: entry.keywords.map((k) =>
    k.split("-").map((part) => stemmer(part))
  ),
}));

/**
 * Try to match stemmed tokens against the pre-stemmed keyword map.
 * Returns the Lucide icon name or null.
 */
function matchTokens(tokens: Set<string>): string | null {
  for (const entry of STEMMED_MAP) {
    for (const stemmedParts of entry.stemmedKeywords) {
      if (stemmedParts.every((part) => tokens.has(part))) {
        return entry.icon;
      }
    }
  }
  return null;
}

/**
 * Tokenize and stem a string into a set of stemmed tokens.
 */
function stemTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter((t) => t.length > 0)
      .map((t) => stemmer(t))
  );
}

/**
 * Extract the first sentence from a description string.
 */
function firstSentence(description: string): string {
  const match = description.match(/^[^.!?]+[.!?]?/);
  return match ? match[0] : description;
}

/**
 * Match an item name/description against the keyword dictionary.
 * 1. Stemmed name match (high confidence)
 * 2. Stemmed first-sentence of description (medium confidence)
 * Returns the Lucide icon name or null if no match.
 */
export function matchItemIcon(
  name: string,
  description?: string
): string | null {
  // Try name first
  const nameResult = matchTokens(stemTokens(name));
  if (nameResult) return nameResult;

  // Fall back to first sentence of description
  if (description) {
    return matchTokens(stemTokens(firstSentence(description)));
  }

  return null;
}
