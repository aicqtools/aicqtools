<div align="right">

[한국어](README.md) | [**English**](README.en.md)

</div>

# aicqtools

> **A code-quality tool that deterministically validates AI-generated code.**
> 50 guardrail rules + AI provenance tracking + EU AI Act Article 50 reports — all in one CLI.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/alpha.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-v1.0.0--alpha.2-orange.svg)](CHANGELOG.md)

> **Deterministic** — same input, same result, no LLM in the loop. Unlike probabilistic tools (Codacy, Greptile), CI runs are stable and auditable.

---

## Why

Code from AI assistants (Claude Code, Cursor, Copilot) compiles fine but routinely violates **company policy, regulation, and domain rules**. aicqtools fills the gap left by general-purpose linters.

### 1. AI vibe-coding repeats the same mistakes
ESLint catches generic patterns but misses *"in this company every LLM client must be a singleton"*. aicqtools starts from 7 patterns extracted by dogfooding (running our own tool on our own code) on a Korean SaaS production monorepo (TalkUp, 205,069 LOC) and ships 50 rules total.

### 2. Korean-domain coverage that global tools skip
Codacy, Semgrep, SonarQube only cover global IT conventions. The compliance and convention rules Korean fintech/startups actually need are missing:
- **FSC AI guidelines** — PII masking, audit logs for AI decisions, model-version tracking
- **PCI DSS** — no plaintext card numbers, payment idempotency, TLS 1.2+
- **Korean IT conventions** — explicit KST timezone, won-amount thousands separator, RFC 5987 Korean filenames, Naver/Kakao OAuth WebView quirks

aicqtools bundles 20 of these Korean-domain rules from day one — useful even outside Korea when you need to handle PCI DSS or audit AI decision-making.

### 3. EU AI Act Article 50 — 3 months out
**Effective 2026-08-02**, every AI system serving the EU must document training data, models, and operators in machine-readable form. Korean (and other non-EU) startups expanding to EU are in scope. aicqtools auto-detects Claude Code/Cursor sessions and renders an AI-BOM (AI Bill of Materials — model/version/license manifest, CycloneDX 1.6 JSON) plus an Article 50 report (HTML or PDF).

---

## What's inside

### Guardrail — 50 deterministic rules

| Category | Count | Examples |
|---------|-------|----------|
| TypeScript / JavaScript global | 12 | `no-direct-anthropic`, `no-process-env-leak`, `route-needs-auth` |
| Python global | 10 | `requests-needs-timeout`, `no-pickle`, `no-fstring-sql` |
| Korean IT conventions | 7 | `explicit-kst-timezone`, `won-format-thousands`, `rfc5987-korean-filename` |
| FSC AI guidelines | 5 | `mask-pii-in-ai-prompt`, `audit-log-ai-decision`, `track-ai-model-version` |
| PCI DSS | 8 | `no-plain-card-number`, `mask-card-number`, `require-tls-1-2-plus` |
| Codebase dogfood | 8 | `no-console-log`, `api-response-shape`, `controller-needs-async-wrapper` |

10K-LOC monorepo cold scan: **3 seconds**. SQLite-cached scan: **20 ms** (150× speedup).

### AI provenance tracking

`aicq provenance capture` records git-staged changes alongside the active AI session.
- **Claude Code native reader** — parses `~/.claude/projects/<encoded-cwd>/*.jsonl`, extracts the model used
- **Cursor detection reader** — checks `state.vscdb` for Cursor activity (full prompt extraction lands in v1.0 stable once the schema is finalized)
- **Manual mode** — record into `.aicq/sessions.json` yourself

### Compliance reports

EU AI Act Article 50 forms in Korean/English bilingual HTML, PDF (`puppeteer` optional peer), or AI-BOM (CycloneDX 1.6 JSON) — all rendered from the same capture.

---

## 5-minute quickstart

```bash
# 1. Install — this one package is enough for most users
npm install --save-dev @aicqtools/cli

# 2. First check
npx aicq check --locale en
# Sample output:
# ✗ src/routes/api.ts:42  no-console-log  warning
#   → Avoid console.log in production code. Use a logger.
# ✗ src/db/schema.ts:18   no-plain-card-number  error
#   → Plaintext card_number column needs an _encrypted suffix (PCI DSS § 3.5.1).

# 3. Inject rules into your AI agents
npx aicq sync-ai-rules --locale en
# → .cursorrules / CLAUDE.md refreshed with the 50-rule summary
# → Claude Code/Cursor pick this context up on the next generation

# 4. (Optional) Capture an AI session — Article 50 readiness
npx aicq provenance capture --reader claude-code
```

CI (GitHub Actions): [packages/action/README.md](packages/action/README.md). Pre-commit hooks: [docs/pre-commit-setup.md](docs/pre-commit-setup.md). MCP (Model Context Protocol — the standard Claude Code/Cursor uses to call external tools): [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md).

---

## Installation note — single `tree-sitter` native instance

`@aicqtools/cli` 1.0.0-alpha.5+ declares `tree-sitter`, `tree-sitter-typescript`, and `tree-sitter-python` as direct `dependencies`, and the internal packages (`core` / `guardrail` / `rule-sdk`) require them as `peerDependencies`. This guarantees a **single hoisted native instance** under npm, pnpm, and yarn.

Why it matters: in alpha.4 each package nested its own `tree-sitter` copy, and `tree-sitter-typescript`'s `peerOptional ^0.21` made npm hoist a separate copy at the user root. Multiple native binding instances ended up loaded in the same V8 isolate; the typescript grammar rejected cross-instance node calls with `SyntaxNode must belong to a Tree` (TalkUp's alpha.4 scan hit 329 occurrences across 3 modules, all `.ts`).

**Workaround if you must stay on alpha.4 or earlier:**

```json
// package.json (npm)
{ "overrides": { "tree-sitter": "0.22.4" } }

// package.json (pnpm)
{ "pnpm": { "overrides": { "tree-sitter": "0.22.4" } } }

// package.json (yarn)
{ "resolutions": { "tree-sitter": "0.22.4" } }
```

Then reinstall. Forces the same single-instance resolution as the alpha.5 fix.

---

## `aicq.config.yaml` essentials

The defaults work out of the box, but here are the three options you'll reach for most. Full schema lives in [`packages/core/src/config/schema.ts`](packages/core/src/config/schema.ts).

### `exclude` — paths the scanner skips entirely

```yaml
# aicq.config.yaml
exclude:
  - 'node_modules/**'
  - 'dist/**'
  - 'build/**'
  - '**/__generated__/**'
  - 'vendor/**'
```

`exclude` is a micromatch glob list. The default already drops common build/cache directories (`.next/`, `coverage/`, `ios/`, `android/`, …), so you only add project-specific paths on top.

**Use it for** — build artifacts, generated code, and vendor directories you never want any rule to see. This is the strongest knob — not per-rule, just **remove paths from every rule's view**.

### `overrides` — per-path rule toggles

```yaml
overrides:
  - paths: ['**/scripts/**', '**/tools/**']
    rules:
      no-console-log: off

  - paths: ['**/integration-tests/**']
    rules:
      no-direct-openai: off
      no-magic-number: warn
```

- `paths` uses **glob OR matching** (`micromatch.isMatch`). Since alpha.10, paths are auto-anchored to the cwd (`scripts/**` → `**/scripts/**`).
- For files matching `paths`, the `rules` map is layered on top of the global rule set.

**Negation is a silent no-op trap** — writing `paths: ['src/**', '!src/app.ts']` ESLint-style triggers a single stderr warning since alpha.11 (`micromatch.isMatch`'s array OR semantics means a negation never subtracts from a sibling positive glob). **To remove paths from the scan, use the top-level `exclude:` field instead.**

### `skipBuiltinSkips` (alpha.13+) — turn off built-in auto-skips

Three built-in rules (`no-console-log` / `no-empty-catch` / `no-magic-number`) carry an internal regex guard that auto-skips conventional paths like `scripts/`, `native-bridge.js`, and `__tests__/`. Turn it off only if you find the built-in skip too aggressive:

```yaml
skipBuiltinSkips: true  # bypass the guard; rules fire on every file
```

Or once-off via CLI:

```bash
aicq check --skip-builtin-skips     # disable
aicq check --no-skip-builtin-skips  # force-enable (overrides config: true)
```

Default `false` — same as alpha.10~12 behavior. The `↳ auto-skipped paths:` line in `aicq rules suggest` output shows you which patterns are active.

---

## The 5 packages (npm `@aicqtools` scope)

| Package | Purpose |
|---------|---------|
| [`@aicqtools/cli`](packages/cli) | The `aicq` binary — what end users actually install |
| [`@aicqtools/guardrail`](modules/guardrail) | Rule engine + the 50 built-in rules |
| [`@aicqtools/provenance`](modules/provenance) | AI session readers + Article 50 / AI-BOM renderers |
| [`@aicqtools/rule-sdk`](packages/rule-sdk) | `defineRule()` helper for custom rules (analogous to ESLint's `RuleCreate`) |
| [`@aicqtools/core`](packages/core) | tree-sitter parser · SQLite incremental cache · SARIF (Static Analysis Results Interchange Format — the industry standard JSON for static-analysis findings) reporter · i18n |

Most users only install **`@aicqtools/cli`**; everything else is pulled in as a dependency.

---

## Learn more

- **GitHub Action** (auto-check on PR) — [packages/action/README.md](packages/action/README.md)
- **MCP setup** — [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md)
- **PDF rendering setup** — [docs/pdf-rendering.md](docs/pdf-rendering.md)
- **Case study** (TalkUp 205K LOC) — [docs/case-studies/talkup-30k.en.md](docs/case-studies/talkup-30k.en.md)
- **EU AI Act data requirements** — [docs/eu-ai-act-data-requirements.md](docs/eu-ai-act-data-requirements.md)
- **Changelog** — [CHANGELOG.md](CHANGELOG.md)

---

## Roadmap

| Date | Milestone |
|------|-----------|
| **2026-05 (current)** | v1.0.0-alpha.2 — 50 rules, MCP, Article 50 HTML/PDF |
| 2026-08-01 | v1.0 stable — just before EU AI Act effective date |
| 2026-09-15 | Phase 1b complete — Cursor SQLite extraction, rule-autocrafting prototype |
| 2026-10-27 | v1.5 SaaS beta — dashboard, PR auto-comments |

---

## License / contributing

MIT — see [LICENSE](LICENSE). Bug reports and rule PRs welcome. `CONTRIBUTING.md` is forthcoming.
