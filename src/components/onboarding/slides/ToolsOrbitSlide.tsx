import { useMemo } from "react";
import { ToolLogo } from "@/components/ToolLogo";
import { LoadoutLogo } from "../LoadoutLogo";
import type { SourceTool } from "@/types";

const TOOLS: { tool: SourceTool; color: string }[] = [
  { tool: "claude", color: "#f97316" },
  { tool: "codex", color: "#22c55e" },
  { tool: "gemini", color: "#3b82f6" },
  { tool: "cursor", color: "#a855f7" },
  { tool: "copilot", color: "#0ea5e9" },
  { tool: "windsurf", color: "#14b8a6" },
  { tool: "roo", color: "#f43f5e" },
  { tool: "cline", color: "#f59e0b" },
  { tool: "kilo", color: "#84cc16" },
  { tool: "opencode", color: "#6366f1" },
];

const RADIUS = 120;
const CENTER = 150;
const TOOL_SIZE = 40;

export function ToolsOrbitSlide() {
  const toolPositions = useMemo(() =>
    TOOLS.map((_, i) => {
      const angle = (i / TOOLS.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: CENTER + Math.cos(angle) * RADIUS - TOOL_SIZE / 2,
        y: CENTER + Math.sin(angle) * RADIUS - TOOL_SIZE / 2,
      };
    }), []);

  return (
    <div className="ob-slide-content">
      <div className="ob-slide-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="ob-slide-title">10 AI tools. One dashboard.</div>
      <div className="ob-slide-subtitle">Manage configurations across every major AI coding assistant from a single place.</div>

      <div className="ob-orbit-container">
        <div className="ob-orbit-ring" />
        <div className="ob-orbit-center">
          <LoadoutLogo className="w-7 h-7" stroke="white" fill="white" />
        </div>
        {TOOLS.map(({ tool, color }, i) => (
          <div
            key={tool}
            className="ob-orbit-tool"
            style={{
              left: toolPositions[i].x,
              top: toolPositions[i].y,
              animationDelay: `${0.3 + i * 0.08}s`,
              color,
            }}
          >
            <ToolLogo tool={tool} size={18} />
          </div>
        ))}
      </div>
    </div>
  );
}
