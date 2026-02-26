#!/usr/bin/env node

/**
 * Release script for Loadout.
 *
 * Usage:
 *   pnpm release patch   # 0.1.0 → 0.1.1
 *   pnpm release minor   # 0.1.0 → 0.2.0
 *   pnpm release major   # 0.1.0 → 1.0.0
 *
 * What it does:
 *   1. Bumps version in package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml
 *   2. Regenerates Cargo.lock
 *   3. Generates a CHANGELOG.md entry from conventional commits since the last tag
 *   4. Creates a git commit: "chore: release vX.Y.Z"
 *   5. Creates an annotated git tag: vX.Y.Z
 *
 * The script does NOT push — review the commit and push when ready:
 *   git push origin main --tags
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf-8", ...opts }).trim();
}

function readJSON(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8"));
}

function writeJSON(rel, obj) {
  writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + "\n");
}

function readText(rel) {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

function writeText(rel, content) {
  writeFileSync(resolve(ROOT, rel), content);
}

// ---------------------------------------------------------------------------
// Version bump
// ---------------------------------------------------------------------------

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}. Use patch, minor, or major.`);
  }
}

function updatePackageJson(newVersion) {
  const pkg = readJSON("package.json");
  pkg.version = newVersion;
  writeJSON("package.json", pkg);
}

function updateTauriConf(newVersion) {
  const conf = readJSON("src-tauri/tauri.conf.json");
  conf.version = newVersion;
  writeJSON("src-tauri/tauri.conf.json", conf);
}

function updateCargoToml(newVersion) {
  const path = resolve(ROOT, "src-tauri/Cargo.toml");
  let content = readFileSync(path, "utf-8");
  // Replace the version in the [package] section (first occurrence)
  content = content.replace(
    /^(version\s*=\s*)"[^"]*"/m,
    `$1"${newVersion}"`
  );
  writeFileSync(path, content);
}

// ---------------------------------------------------------------------------
// Changelog generation
// ---------------------------------------------------------------------------

function getLastTag() {
  try {
    return run("git describe --tags --abbrev=0");
  } catch {
    return null;
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  try {
    const log = run(`git log ${range} --pretty=format:"%s"`);
    return log ? log.split("\n").map((s) => s.replace(/^"|"$/g, "")) : [];
  } catch {
    return [];
  }
}

function parseConventionalCommits(messages) {
  const sections = {
    Added: [],
    Fixed: [],
    Changed: [],
  };

  for (const msg of messages) {
    const match = msg.match(/^(\w+)(?:\(.+?\))?!?:\s*(.+)/);
    if (!match) continue;

    const [, type, description] = match;
    const desc = description.charAt(0).toUpperCase() + description.slice(1);

    switch (type) {
      case "feat":
        sections.Added.push(desc);
        break;
      case "fix":
        sections.Fixed.push(desc);
        break;
      case "refactor":
      case "perf":
        sections.Changed.push(desc);
        break;
      // chore, docs, ci, test, style → skipped (internal)
    }
  }

  return sections;
}

function generateChangelogEntry(version, sections) {
  const date = new Date().toISOString().split("T")[0];
  let entry = `## [${version}] - ${date}\n`;

  let hasContent = false;
  for (const [heading, items] of Object.entries(sections)) {
    if (items.length === 0) continue;
    hasContent = true;
    entry += `\n### ${heading}\n\n`;
    for (const item of items) {
      entry += `- ${item}\n`;
    }
  }

  if (!hasContent) {
    entry += "\n- Maintenance release\n";
  }

  return entry;
}

function updateChangelog(newEntry) {
  const path = resolve(ROOT, "CHANGELOG.md");

  if (!existsSync(path)) {
    const content = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/),\nand this project adheres to [Semantic Versioning](https://semver.org/).\n\n${newEntry}`;
    writeText("CHANGELOG.md", content);
    return;
  }

  let content = readText("CHANGELOG.md");

  // Insert new entry after the header (after the "adheres to" line or first blank line after header)
  const headerEndPattern = /^(# Changelog\n[\s\S]*?adheres to \[Semantic Versioning\]\([^)]+\)\.\n)\n/m;
  const match = content.match(headerEndPattern);

  if (match) {
    const insertPos = match.index + match[0].length;
    content = content.slice(0, insertPos) + newEntry + "\n" + content.slice(insertPos);
  } else {
    // Fallback: insert after first blank line
    const firstBlank = content.indexOf("\n\n");
    if (firstBlank !== -1) {
      content = content.slice(0, firstBlank + 2) + newEntry + "\n" + content.slice(firstBlank + 2);
    } else {
      content += "\n" + newEntry;
    }
  }

  writeText("CHANGELOG.md", content);
}

// ---------------------------------------------------------------------------
// Git operations
// ---------------------------------------------------------------------------

function ensureCleanWorkingTree() {
  const status = run("git status --porcelain");
  if (status) {
    console.error("Error: Working tree is not clean. Commit or stash your changes first.");
    console.error(status);
    process.exit(1);
  }
}

function ensureOnMain() {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  if (branch !== "main") {
    console.error(`Error: You must be on the 'main' branch to release. Currently on '${branch}'.`);
    process.exit(1);
  }
}

function gitCommitAndTag(version) {
  run("git add -A");
  run(`git commit -m "chore: release v${version}"`);
  run(`git tag -a v${version} -m "v${version}"`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const bumpType = process.argv[2];

if (!bumpType || !["patch", "minor", "major"].includes(bumpType)) {
  console.error("Usage: pnpm release [patch|minor|major]");
  process.exit(1);
}

// Safety checks
ensureCleanWorkingTree();
ensureOnMain();

// Read current version
const pkg = readJSON("package.json");
const currentVersion = pkg.version;
const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`\nBumping version: ${currentVersion} → ${newVersion}\n`);

// 1. Bump version in all files
console.log("  Updating package.json...");
updatePackageJson(newVersion);

console.log("  Updating src-tauri/tauri.conf.json...");
updateTauriConf(newVersion);

console.log("  Updating src-tauri/Cargo.toml...");
updateCargoToml(newVersion);

// 2. Regenerate Cargo.lock
console.log("  Regenerating Cargo.lock...");
run("cargo generate-lockfile", { cwd: resolve(ROOT, "src-tauri") });

// 3. Generate changelog
console.log("  Generating changelog...");
const lastTag = getLastTag();
const commits = getCommitsSince(lastTag);
const sections = parseConventionalCommits(commits);
const changelogEntry = generateChangelogEntry(newVersion, sections);
updateChangelog(changelogEntry);

// 4. Git commit + tag
console.log("  Creating git commit and tag...");
gitCommitAndTag(newVersion);

console.log(`\nRelease v${newVersion} ready!\n`);
console.log("Next steps:");
console.log(`  1. Review: git log --oneline -1 && git diff HEAD~1`);
console.log(`  2. Generate release notes: pnpm release:notes`);
console.log(`  3. Edit .github/release-notes/v${newVersion}.md — add screenshots, tweak copy`);
console.log(`  4. Commit: git add .github/release-notes && git commit --amend --no-edit`);
console.log(`  5. Push:   git push origin main --tags`);
console.log("");
