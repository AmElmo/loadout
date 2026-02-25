import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getColorForName } from "@/lib/colors";
import { useNpmFavicon } from "@/hooks/useNpmFavicon";

interface MCPIconProps {
  name: string;
  mcpType: "stdio" | "http";
  url?: string | null;
  args?: string[];
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

export function MCPIcon({ name, mcpType, url, args = [], className }: MCPIconProps) {
  const [faviconError, setFaviconError] = useState(false);
  const [npmFaviconError, setNpmFaviconError] = useState(false);
  const npmFaviconUrl = useNpmFavicon(mcpType === "stdio" ? args : []);

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

  // For stdio with npm favicon resolved: show it
  if (npmFaviconUrl && !npmFaviconError) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted",
          className
        )}
      >
        <img
          src={npmFaviconUrl}
          alt=""
          className="h-5 w-5"
          onError={() => setNpmFaviconError(true)}
        />
      </div>
    );
  }

  // Fallback: first letter avatar with consistent color
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
