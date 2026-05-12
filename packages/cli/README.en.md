<div align="right">

[한국어](README.md) | [**English**](README.en.md)

</div>

# @aicqtools/cli

> The unified `aicq` command-line interface.
> `check` · `sync-ai-rules` · `mcp` · `provenance` · `docs build`.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/alpha.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aicqtools/aicqtools/blob/main/LICENSE)

This is the user-facing entry point for the aicqtools monorepo. **Install just this one package** and [`@aicqtools/guardrail`](https://www.npmjs.com/package/@aicqtools/guardrail), [`@aicqtools/provenance`](https://www.npmjs.com/package/@aicqtools/provenance), [`@aicqtools/core`](https://www.npmjs.com/package/@aicqtools/core), and [`@aicqtools/rule-sdk`](https://www.npmjs.com/package/@aicqtools/rule-sdk) come along as dependencies.

## Install

```bash
npm install --save-dev @aicqtools/cli
# or
pnpm add -D @aicqtools/cli
```

The `aicq` binary is added to `node_modules/.bin/`. Invoke it with `npx aicq` or via `package.json` `scripts`.

## Commands

| Command | Purpose |
|---------|---------|
| `aicq check` | Run the 50 guardrail rules against your project (text/JSON/SARIF output) |
| `aicq sync-ai-rules` | Auto-inject the rule context into `.cursorrules` / `CLAUDE.md` |
| `aicq mcp` | Start the MCP (Model Context Protocol) server for Claude Code / Cursor |
| `aicq provenance capture` | Record git-staged changes and the active AI session as JSON |
| `aicq provenance report <record>` | Render a capture as an EU AI Act Article 50 report (HTML/PDF) or AI-BOM (CycloneDX 1.6) |
| `aicq docs build` | Generate per-rule markdown for all 50 rules in Korean and English |

Each command shows its full flag set with `aicq <command> --help`. Message language is controlled across all commands by `--locale ko|en`.

## Common scenarios

### 1) First-time setup — check + agent rule sync

```bash
# Run all 50 rules over src/ (warnings exit 0, errors exit 1)
npx aicq check --locale en

# Refresh .cursorrules and CLAUDE.md with the 50-rule summary
# → Claude Code/Cursor pick the context up on the next generation
npx aicq sync-ai-rules --locale en
```

### 2) Real-time Claude Code integration (MCP)

Block violations *before* the model writes them, at prompt time — not after.

```bash
claude mcp add --transport stdio aicq -- \
  node /absolute/path/node_modules/@aicqtools/cli/dist/bin.js mcp
```

Full guide: [docs/mcp-claude-code-setup.md](https://github.com/aicqtools/aicqtools/blob/main/docs/mcp-claude-code-setup.md)

### 3) EU AI Act Article 50 PDF report

```bash
# Auto-detect and capture the AI session
npx aicq provenance capture --reader claude-code \
  --output capture.json

# Render to PDF (puppeteer optional peer required — pnpm add puppeteer)
npx aicq provenance report capture.json \
  --format article-50-pdf --locale en \
  --output report.pdf
```

If you don't need PDF, `--format article-50-html` produces HTML without the puppeteer dependency. For a machine-readable manifest, `--format ai-bom` emits CycloneDX 1.6 JSON.

## Output formats

`aicq check --format`:
- `text` (default) — human-readable colored output
- `json` — for programmatic post-processing
- `sarif` — SARIF 2.1.0 (compatible with GitHub Code Scanning and the VS Code SARIF Viewer)

## Learn more

Full docs · all 50 rules · roadmap: [aicqtools monorepo README](https://github.com/aicqtools/aicqtools)

## License

MIT — Eom Sik <neuralflux3@gmail.com>
