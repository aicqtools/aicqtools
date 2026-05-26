<div align="right">

[한국어](README.md) | [**English**](README.en.md)

</div>

# @aicqtools/cli

> The unified `aicq` command-line interface.
> `check` · `sync-ai-rules` · `mcp` · `provenance` · `docs build`.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/beta.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aicqtools/aicqtools/blob/HEAD/LICENSE)

This is the user-facing entry point for the aicqtools monorepo. **Install just this one package** and [`@aicqtools/guardrail`](https://www.npmjs.com/package/@aicqtools/guardrail), [`@aicqtools/provenance`](https://www.npmjs.com/package/@aicqtools/provenance), [`@aicqtools/core`](https://www.npmjs.com/package/@aicqtools/core), and [`@aicqtools/rule-sdk`](https://www.npmjs.com/package/@aicqtools/rule-sdk) come along as dependencies.

## Install

```bash
# Beta (current latest tag)
npm install --save-dev @aicqtools/cli
# Or explicitly
npm install --save-dev @aicqtools/cli@beta
# To pin alpha
# npm install --save-dev @aicqtools/cli@alpha
```

The `aicq` binary is added to `node_modules/.bin/`. Invoke it with `npx aicq` or via `package.json` `scripts`.

## Commands

| Command | Purpose |
|---------|---------|
| `aicq init` | Scaffold `aicq.config.yaml` and `.github/workflows/aicq-check.yml` for a stack (`--stack next\|nest\|capacitor\|generic`) |
| `aicq check` | Run the 50 guardrail rules against your project (text/JSON/SARIF output) |
| `aicq sync-ai-rules` | Auto-inject the rule context into `.cursorrules` / `CLAUDE.md` |
| `aicq mcp` | Start the MCP (Model Context Protocol) server for Claude Code / Cursor |
| `aicq provenance capture` | Record git-staged changes and the active AI session as JSON |
| `aicq provenance report <record>` | Render a capture as an EU AI Act Article 50 report (HTML/PDF) or AI-BOM (CycloneDX 1.6). Pass `--guardrail-result <path>` (an `aicq check --format json` output) to embed a guardrail violations summary section (1.0.0-beta.2+) |
| `aicq docs build` | Generate per-rule markdown for all 50 rules in Korean and English |

Each command shows its full flag set with `aicq <command> --help`. Message language is controlled across all commands by `--locale ko|en`.

## Common scenarios

### 1) First-time setup — init + check + agent rule sync

```bash
# Pick a stack → writes aicq.config.yaml + .github/workflows/aicq-check.yml
npx aicq init --stack next   # or nest | capacitor | generic
# Existing files are not overwritten; pass --force if you want to.
# Use --no-workflow if you only want the config (no CI integration).

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

Full guide: [docs/mcp-claude-code-setup.md](https://github.com/aicqtools/aicqtools/blob/HEAD/docs/mcp-claude-code-setup.md)

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

#### Embed a guardrail violations summary (1.0.0-beta.2+)

```bash
# 1. Save the guardrail result as JSON
npx aicq check --format json --output check.json

# 2. Attach it to provenance report → the report gains a guardrail summary section
#    (total violations / files with violations / severity breakdown / rule-category breakdown)
npx aicq provenance report capture.json \
  --format article-50-html --locale en \
  --guardrail-result check.json > report.html
```

The `--guardrail-result` option works for all three formats (JSON / HTML / PDF). Omit it and the report keeps the prior shape — fully backward compatible.

## Output formats

`aicq check --format`:
- `text` (default) — human-readable colored output
- `json` — for programmatic post-processing
- `sarif` — SARIF 2.1.0 (compatible with GitHub Code Scanning and the VS Code SARIF Viewer)

## Learn more

Full docs · all 50 rules · roadmap: [aicqtools monorepo README](https://github.com/aicqtools/aicqtools)

## License

MIT — Eom Sik <neuralflux3@gmail.com>
