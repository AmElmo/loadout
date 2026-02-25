import { useState, useEffect } from "react";

const CACHE_KEY = "loadout:npm-favicon-cache:v2";

// Clean up old cache key from v1
localStorage.removeItem("loadout:npm-homepage-cache");

/**
 * Read the npm homepage cache from localStorage.
 * Keys are package names, values are homepage URLs (or "" for no-homepage).
 */
function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

/**
 * Extract an npm package name from MCP stdio args.
 * Handles patterns like:
 *   ["npx", "-y", "@modelcontextprotocol/server-github"]
 *   ["-y", "@scope/package", "--flag"]
 *   ["@scope/package"]
 *   ["some-package"]
 */
export function parseNpmPackage(args: string[]): string | null {
  for (const arg of args) {
    // Skip flags like -y, --yes, --quiet
    if (arg.startsWith("-")) continue;

    // Match scoped (@scope/name) or plain packages, stripping version suffixes (@latest, @1.2.3)
    const scopedMatch = arg.match(/^(@[\w-]+\/[\w.-]+)(?:@.*)?$/);
    if (scopedMatch) return scopedMatch[1];

    const plainMatch = arg.match(/^([a-z][\w.-]*)(?:@.*)?$/);
    if (plainMatch) return plainMatch[1];
  }
  return null;
}

/** Code-hosting domains whose favicons are generic (octocat, etc.) */
const CODE_HOST_DOMAINS = new Set([
  "github.com",
  "github.io",
  "gitlab.com",
  "gitlab.io",
  "bitbucket.org",
  "sourceforge.net",
  "codeberg.org",
]);

/**
 * Extract root domain from a URL for favicon fetching.
 * Returns null for code-hosting domains (their favicons are unhelpful).
 */
function extractUsableDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.hostname.split(".");
    const root = parts.length >= 2 ? parts.slice(-2).join(".") : parsed.hostname;
    if (CODE_HOST_DOMAINS.has(root)) return null;
    return root;
  } catch {
    return null;
  }
}

/**
 * Hook that resolves a favicon URL for stdio MCPs by looking up
 * the npm package's homepage in the registry.
 *
 * Returns null while loading or if no favicon can be resolved.
 * Results are cached in localStorage across renders and app restarts.
 */
export function useNpmFavicon(args: string[]): string | null {
  const pkg = parseNpmPackage(args);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(() => {
    if (!pkg) return null;
    const cached = readCache()[pkg];
    if (cached === undefined) return null;
    if (cached === "") return null; // cached "no homepage"
    const domain = extractUsableDomain(cached);
    return domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      : null;
  });

  useEffect(() => {
    if (!pkg) return;

    const cache = readCache();
    if (cache[pkg] !== undefined) return; // already cached (hit or miss)

    let cancelled = false;

    fetch(`https://registry.npmjs.org/${pkg}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`npm ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const homepage: string | undefined = data.homepage;
        const updated = readCache();
        updated[pkg] = homepage || "";
        writeCache(updated);

        if (homepage) {
          const domain = extractUsableDomain(homepage);
          if (domain) {
            setFaviconUrl(
              `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
            );
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Cache failure as empty so we don't retry
        const updated = readCache();
        updated[pkg] = "";
        writeCache(updated);
      });

    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return faviconUrl;
}
