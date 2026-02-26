#!/usr/bin/env node

/**
 * Generate human-friendly release notes using Claude Code CLI.
 *
 * Usage:
 *   pnpm release:notes          # Generate for the latest tag
 *   pnpm release:notes v0.3.0   # Generate for a specific tag
 *
 * Requires `claude` CLI (Claude Code) installed and authenticated via Claude Max.
 * Outputs to .github/release-notes/vX.Y.Z.md for review before publishing.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf-8" }).trim();
}

// ---------------------------------------------------------------------------
// Resolve tag range
// ---------------------------------------------------------------------------

const arg = process.argv[2];
const tag = arg
  ? arg.startsWith("v") ? arg : `v${arg}`
  : git("describe --tags --abbrev=0");

let previousTag;
try {
  previousTag = git(`describe --tags --abbrev=0 ${tag}^`);
} catch {
  previousTag = null;
}

const version = tag.replace(/^v/, "");
const outFile = `.github/release-notes/${tag}.md`;

console.log(`\nGenerating release notes for ${tag}`);
console.log(`  Range: ${previousTag || "(initial)"}..${tag}`);
console.log(`  Output: ${outFile}\n`);

// ---------------------------------------------------------------------------
// Gather context
// ---------------------------------------------------------------------------

const range = previousTag ? `${previousTag}..${tag}` : tag;
const commitLog = git(`log ${range} --pretty=format:"- %s%n%b" --no-merges`);

let changelogEntry = "";
try {
  const changelog = readFileSync(resolve(ROOT, "CHANGELOG.md"), "utf-8");
  const start = changelog.indexOf(`## [${version}]`);
  if (start !== -1) {
    const end = changelog.indexOf("\n## [", start + 1);
    changelogEntry = changelog.slice(start, end !== -1 ? end : undefined);
  }
} catch {}

// ---------------------------------------------------------------------------
// Build prompt (single string piped via stdin — no shell escaping needed)
// ---------------------------------------------------------------------------

const prompt = `You are a developer advocate writing release notes for Loadout, a desktop app that helps developers manage AI tool configurations (Claude, Codex, Gemini — their MCPs, skills, rules, and hooks).

Write release notes that a user would enjoy reading. Follow this exact structure:

## 🎉 What's New in vX.Y.Z

### [Feature/Fix Name in Plain English]
1-3 sentences explaining what changed and WHY it matters to the user. Focus on the benefit, not the implementation.

<!-- 📸 screenshot: [describe what to capture — e.g., "the new MCP server list with add/edit buttons"] -->

(Repeat for each notable change. Group related commits into a single section.)

---

**Full Changelog**: [previous tag]...vX.Y.Z

Rules:
- Write for users, not developers. No commit hashes, no PR numbers in the narrative.
- Group related changes into coherent features — don't just reword each commit.
- Skip purely internal changes (CI, chore, deps) unless they affect the user.
- Add a <!-- 📸 screenshot: ... --> placeholder after each feature section. Be specific about what the screenshot should show.
- For bug fixes, use a "### Bug Fixes" section with a brief bullet list.
- Keep it concise — aim for the length of a short blog post, not a novel.
- Use emoji sparingly (just the 🎉 in the title and 🐛 for bug fixes if any).

---

Generate release notes for Loadout ${tag}.

Commits since ${previousTag || "the beginning"}:
${commitLog}
${changelogEntry ? `\nChangelog entry for reference:\n${changelogEntry}` : ""}`;

// ---------------------------------------------------------------------------
// Call Claude via stdin (safe — no shell escaping of user content)
// ---------------------------------------------------------------------------

try {
  execSync("which claude", { stdio: "ignore" });
} catch {
  console.error("Error: `claude` CLI not found. Install Claude Code: https://docs.anthropic.com/en/docs/claude-code");
  process.exit(1);
}

console.log("  Calling Claude...\n");

let releaseNotes;
try {
  releaseNotes = execSync("claude -p", {
    input: prompt,
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 120_000,
  }).trim();
} catch (err) {
  console.error("Error: Claude CLI failed. Make sure you're authenticated.");
  console.error(err.stderr || err.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

writeFileSync(resolve(ROOT, outFile), releaseNotes + "\n");

console.log(`  ✅ Written to ${outFile}\n`);
console.log("Next steps:");
console.log(`  1. Review and edit the file`);
console.log(`  2. Replace <!-- 📸 screenshot: ... --> placeholders with actual images`);
console.log(`  3. Commit and push: git add .github/release-notes && git commit --amend --no-edit && git push origin main --tags`);
console.log(`  4. CI will use this file as the GitHub Release body automatically\n`);
