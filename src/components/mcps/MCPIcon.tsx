import { useState } from "react";
import { Globe, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MCPIconProps {
  name: string;
  mcpType: "stdio" | "http";
  url?: string | null;
  className?: string;
}

/**
 * Extract root domain from a URL for favicon fetching
 * e.g., "https://mcp.linear.app/mcp" -> "linear.app"
 */
function extractRootDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.hostname.split(".");
    // Get last two parts (e.g., "linear.app" from "mcp.linear.app")
    // Handle cases like "example.co.uk" by taking last 2-3 parts
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Get a consistent color for a given name (for first-letter avatars)
 */
function getColorForName(name: string): string {
  const colors = [
    "bg-red-500/10 text-red-500",
    "bg-orange-500/10 text-orange-500",
    "bg-amber-500/10 text-amber-500",
    "bg-yellow-500/10 text-yellow-500",
    "bg-lime-500/10 text-lime-500",
    "bg-green-500/10 text-green-500",
    "bg-emerald-500/10 text-emerald-500",
    "bg-teal-500/10 text-teal-500",
    "bg-cyan-500/10 text-cyan-500",
    "bg-sky-500/10 text-sky-500",
    "bg-blue-500/10 text-blue-500",
    "bg-indigo-500/10 text-indigo-500",
    "bg-violet-500/10 text-violet-500",
    "bg-purple-500/10 text-purple-500",
    "bg-fuchsia-500/10 text-fuchsia-500",
    "bg-pink-500/10 text-pink-500",
  ];

  // Simple hash of name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function MCPIcon({ name, mcpType, url, className }: MCPIconProps) {
  const [faviconError, setFaviconError] = useState(false);

  const isHttp = mcpType === "http";
  const domain = url ? extractRootDomain(url) : null;
  const canShowFavicon = isHttp && domain && !faviconError;

  // For HTTP with valid domain: try favicon
  if (canShowFavicon) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    return (
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted",
          className
        )}
      >
        <img
          src={faviconUrl}
          alt=""
          className="h-5 w-5"
          onError={() => setFaviconError(true)}
        />
      </div>
    );
  }

  // For HTTP without favicon: Globe icon
  if (isHttp) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10",
          className
        )}
      >
        <Globe className="h-5 w-5 text-blue-500" />
      </div>
    );
  }

  // For stdio: first letter avatar with consistent color
  const firstLetter = name.charAt(0).toUpperCase();
  const colorClass = getColorForName(name);

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold",
        colorClass,
        className
      )}
    >
      {firstLetter}
    </div>
  );
}
