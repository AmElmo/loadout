# Changelog

## [0.4.1] - 2026-04-02

### Added

- Add full-screen onboarding flow for first-time users (#122)
- Revamp workspace navigation with Repos page and simplified sidebar (#120)
- Add delete flows for MCPs, skills, and agents (LOA-38) (#118)

### Fixed

- Tighten launch readiness and test isolation (#123)
- Allow draft release validation (#121)
- Correct asset paths and add landing page resources (#119)
- Add macOS bundle category and prune Desktop/Documents from scans (#113)
- Use list releases API to find drafts in updater validation
- Darken modal backdrop for better focus (#114)

## [0.4.0] - 2026-04-01

### Added

- Add full-screen onboarding flow for first-time users (#122)
- Revamp workspace navigation with Repos page and simplified sidebar (#120)
- Add delete flows for MCPs, skills, and agents (LOA-38) (#118)

### Fixed

- Allow draft release validation (#121)
- Correct asset paths and add landing page resources (#119)
- Add macOS bundle category and prune Desktop/Documents from scans (#113)
- Use list releases API to find drafts in updater validation
- Darken modal backdrop for better focus (#114)

## [0.3.0] - 2026-04-01

### Added

- Revamp workspace navigation with a dedicated Repos page and simplified sidebar (#120)
- Add delete flows for MCPs, skills, and agents (LOA-38) (#118)

### Fixed

- Correct landing page asset paths (#119)
- Add macOS bundle category and prune Desktop/Documents from scans (#113)
- Fix draft release detection in updater validation
- Darken modal backdrop for better focus (#114)

## [0.2.3] - 2026-04-01

### Fixed

- Harden macOS release notarization (#111)

## [0.2.2] - 2026-03-30

- Maintenance release

## [0.2.1] - 2026-03-30

### Added

- Configure macOS code signing and notarization in CI (#108)
- Plugin skills viewer and path reveal fixes (#107)
- Add direct download links and auto-update workflow for README (#98)
- Add resizable sidebar with persistent width (#92)
- Add vibrant orbital readme banner with concept icons (#91)
- Add comprehensive keyboard shortcuts with settings panel and click-outside modal closing (#89)
- Add plugins scanner with read-only visibility (#90)
- Add dark/light/system theme toggle (LOA-28) (#88)
- Add automated release notes generation with Claude Code CLI (#87)

### Fixed

- Resolve unused struct warnings and enhance Learn page timeline UI (#93)

### Changed

- Ui polish with color refinement and tool coverage visualization (#96)

## [0.2.0] - 2026-02-26

- Maintenance release

## [0.1.1] - 2026-02-26

### Added

- Set up release pipeline with versioning, CI builds, and auto-updates (#79)
- Update skill and MCP icons to Hammer and Unplug (#78)
- Add keyboard shortcuts and save feedback to dialogs (#76)
- Update README hero image with brand-aligned SVG (#75)
- Add brand identity kit with logo, icons, and assets (#74)
- Increase default window size to 1440x900 (#73)
- Improve skill icon matching with stemming and universal categories (#71)
- Scan repos without rules and generate with CLI (#LOA-20) (#57)
- Security hardening for open source release (#48)
- Add markdown preview for skills and rules (#47)
- Add keyword-based skill icons with user override support (#LOA-14) (#45)
- Symlink-based skill installation with link/copy mode (#LOA-6) (#42)
- Disable autocorrect on search inputs (#LOA-24) (#41)
- Filter sync dialogs to only show installed tools (#38)
- Consolidate skill import/install with URL fetching and drag-drop (#37)
- Expand ecosystem table to show all 10 supported AI coding tools (#36)
- Make context window size configurable per tool (#35)
- Expand AI tool support with detection and UI enhancements (#34)
- Add detected tools display section to home page (#32)
- Redesign sync dialog UX and enable HTTP MCP support for Codex (#30)
- Add ToolLogo component and integrate it across UI (#29)
- Add project-level hooks/MCPs support and home dashboard (#28)
- Add Learn page with educational concept cards (#27)
- Add reveal-in-file-manager functionality for config files and paths (#26)
- Add infinite scroll and search across all list sections (#21)
- Add context window visualization with MCP tool token estimation (#19)
- Add scoped rules support across Claude Code, Codex, and Gemini (#16)
- Add MCP health testing and Claude Code legacy command scanning (#14)
- Add filtering by tool and scope to MCPs and Skills pages (#13)
- Implement MCP registry, skills scanner, config pages, and cross-tool sync (#11)
- Implement Issue 4 (Rules & Hooks pages) + workspace discovery (#9)
- Implement Skills Scanner (Issue 3) (#7)

### Fixed

- Disambiguate backup filenames with stable path hash (#LOA-26) (#72)

### Changed

- Align rules scope terminology with official documentation (#20)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).
