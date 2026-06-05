# myWiki

[中文文档](./README_zh.md)

> Personal knowledge wiki — AI-powered structured understanding network

myWiki is not a note-taking tool. It stores **structured understanding**: each node is an independently referenceable cognitive unit (observation, insight, decision, question, comparison), interconnected through semantic relations to form an evolving knowledge network.

## Prerequisites

- Node.js >= 20

## Quick Start

```bash
# Global install (recommended, download once)
npm install -g mywiki-cli
mywiki init
mywiki panel

# Or run directly with npx (no install needed)
npx mywiki-cli init
npx mywiki-cli panel
```

After initialization, just talk to your AI agent:

```
> Ingest this article: https://example.com/article
> What do I have about distributed systems in my wiki?
> Run a lint check
```

## How It Works

```
You ──chat──→ AI Agent (Claude Code, Codex, Gemini CLI, etc.)
                 │
                 ├── Loads mywiki skill (synced from ~/.mywiki/skills/mywiki/)
                 ├── Distills material into knowledge nodes
                 └── Writes to <wikiDir>/nodes/
                          │
                          └──→ mywiki panel to visualize
```

**The CLI does no AI work.** AI logic is executed by your own agent through the installed skill. The CLI only handles environment setup and the visualization panel.

## Commands

| Command | Description |
|---------|-------------|
| `mywiki init [--path <dir>] [--with-samples]` | Create wiki directory + install skill |
| `mywiki panel [--port 9888]` | Start visualization panel |
| `mywiki update` | Update skill to latest version |

> All commands can also be run via `npx mywiki-cli <command>`.

## Supported AI Tools

During `mywiki init`, you can select which tools to install the skill to:

| Tool | Install Location |
|------|-----------------|
| Claude Code | `~/.claude/skills/mywiki/` |
| Codex | `~/.codex/skills/mywiki/` |
| Gemini CLI | `~/.gemini/skills/mywiki/` |
| OpenCode | `~/.config/opencode/skills/mywiki/` |
| Hermes | `~/.hermes/skills/mywiki/` |

Legacy compatibility:
- Cursor still uses `~/.cursor/rules/mywiki.mdc`
- Windsurf still uses `~/.codeium/windsurf/memories/global_rules.md`
- On Windows, directory linking falls back to directory copy if junction/symlink creation fails

## Directory Structure

```
~/.mywiki/                ← App config + shared skill store
├── config.json           ← Stores wikiDir, panel settings, target tools
└── skills/
    └── mywiki/           ← SSOT skill directory synced to agents

<wikiDir>/                ← Your knowledge data (default: ~/mywiki, configurable)
├── nodes/                ← Wiki nodes (markdown + frontmatter)
├── raw/                  ← Raw materials
└── meta/
    ├── index.md          ← Content index
    └── log.md            ← Operation log
```

The app config location is fixed at `~/.mywiki/`, while the actual wiki data directory is whatever `~/.mywiki/config.json` stores in `wikiDir`.

## Node Example

```markdown
---
id: delayed-gratification
title: Delayed gratification is not about endurance
meta_type: insight
insight_origin: explicit
domains: ["#life/parenting", "#self-management"]
status: growing
created: 2025-03-12
updated: 2025-04-30
relations:
  - { to: marshmallow-experiment, type: extends }
---

Delayed gratification is often misunderstood as "suppressing desire." What actually works is having a clear expectation of what happens after the delay...
```

## Visualization Panel

The panel provides:
- Home overview (node statistics, emergent hubs)
- Timeline (sorted by update/creation)
- Global graph (Cytoscape force-directed layout)
- Emergence / self-evolution view
- Full-text search

### Local Usage

```bash
mywiki panel
```

No login required by default; reads the local wiki directory directly.

## Online Deployment (Vercel, etc.)

Deploy this repo to Vercel, then configure a GitHub repository via the "Data Source" button in the panel (supports private repos — enter a GitHub Personal Access Token in your browser). Configuration is saved in browser localStorage and auto-refreshes on each visit.

Set the `MYWIKI_PASSWORD` environment variable to enable password protection.

## Security

- Password protection via `MYWIKI_PASSWORD` env var, using HMAC-signed cookie verification
- Markdown rendering is XSS-sanitized (rehype-sanitize + DOMPurify)
- GitHub Token is stored only in your browser's localStorage, never sent to the server

## Limitations

- The panel is read-only; it does not support editing nodes online (single source of truth)
- Local panel has no password protection by default (suitable for personal machines)

## Development

```bash
git clone <repo-url>
cd mywiki-cli
npm install
cd site && npm install && cd ..
npm run lint       # ESLint
npm run build      # Build skill + panel
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
