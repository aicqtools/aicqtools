<div align="right">

[한국어](README.md) | [**English**](README.en.md)

</div>

# aicqtools

> **A code-quality tool that deterministically validates AI-generated code.**
> 50 guardrail rules + AI provenance tracking + EU AI Act Article 50 reports — all in one CLI.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/beta.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-v1.0.0--beta.2-blue.svg)](CHANGELOG.md)
[![EU AI Act Article 50](https://img.shields.io/badge/EU%20AI%20Act%20Article%2050-D--72%20(2026--08--02)-orange.svg)](docs/eu-ai-act-data-requirements.md)

> **Deterministic** — same input, same result, no LLM in the loop. Unlike probabilistic tools (Codacy, Greptile), CI runs are stable and auditable.

> ⏰ **EU AI Act Article 50 effective in 73 days (2026-08-02)** — Teams shipping AI-generated code into the EU face obligations as **provider** (machine-readable output marking) or **deployer** (disclosure for AI-generated public-interest text). aicqtools auto-captures Claude Code/Cursor sessions and renders Article 50 reports (HTML/PDF, Korean+English) plus an AI-BOM (CycloneDX 1.6) per PR — attach those attribution artefacts to the same PR as your starting point for compliance.

---

## 🇰🇷 Why aicqtools? — Korean-localized for fintech/SaaS teams

aicqtools is an open-source code-quality tool that bundles Korean IT-convention and FSC AI-guideline rules. Currently in beta (1.0.0-beta.1), designed to run alongside global linters like ESLint and SonarQube. Based on publicly available information as of 2026-05, CodeRabbit · Codacy · SonarQube · ESLint AI do not ship Korean IT rules, Korean FSC AI-guideline rules, or a Korean UI by default. aicqtools provides:

- **7 Korean IT-convention rules** — explicit KST timezone, broken-Hangul comment detection, RFC 5987 Korean filename `Content-Disposition`, Capacitor + Kakao/Naver OAuth WebView anti-pattern, KRW thousands separator, UTF-8 enforcement, Sequelize migration column camelCase.
- **5 Korean FSC AI-guideline rules** — PII masking before AI prompts, explainability metadata, AI-decision audit logging, human-oversight checkpoints, AI model-version tracking. The EU AI Act Article 50 metadata report is also rendered in Korean (guardrail-detection integration is scheduled for 1.0.0-beta.2). aicqtools brings Korean and EU compliance into one tool — useful starting point, not a substitute for legal review.
- **Full Korean i18n** — **44/45 = 97.8%** of rules have native Korean messages. CLI output is 100% Korean under `aicq check --locale ko` or `LANG=ko_KR.UTF-8`. `aicq docs build` generates Korean and English rule docs side-by-side.

| Item | aicqtools | CodeRabbit | Codacy/SonarQube | ESLint AI |
|---|---|---|---|---|
| Korean IT rules | **7** | 0 | 0 | 0 |
| FSC AI-guideline rules | **5** | 0 | 0 | 0 |
| Korean UI | **97.8% native** | English only | English only | English only |
| KST · KRW · Hangul filename | **Yes** | No | No | No |
| Naver/Kakao OAuth anti-pattern | **Yes** | No | No | No |
| EU AI Act Article 50 metadata report | **Yes** (Korean-rendered; guardrail integration scheduled for beta.2) | No | No | No |

---

### 🎯 The 10-second analogy

If you're new to aicqtools, think of it this way:

- **UL Listing + HACCP, but for code.** UL Listing certifies that a US plug is safe for 120 V; KS mark does the same for 220 V outlets in Korea. Code has the same problem — Korean services need explicit KST timezone, UTF-8 encoding, Korean filename `Content-Disposition` per RFC 5987, and Kakao/Naver OAuth quirks. Global linters (ESLint, SonarQube) check the equivalent of the 120 V world only.
- **HACCP-style hazard analysis before things ship.** A food plant runs HACCP to identify where contamination *could* enter and seal those points off in advance. aicqtools does the same for AI code hazards — PII landing in an LLM prompt, AI decisions without audit trails, untracked model versions — *before* PRs merge. The 5 FSC AI-guideline rules encode this for Korean fintech, but PCI DSS and EU AI Act coverage apply globally too.
- **Annual vehicle inspection on every PR.** Cars hide accumulated wear until the inspection forces it into the light. aicqtools runs on every PR — violations block the merge, so risky code never reaches main. Runs **alongside** (not replacing) ESLint and TypeScript.
- **Structural-audit scale, in seconds.** Think of a 30-year-old apartment's structural audit covering wiring, plumbing, and load all at once — that's 50 built-in rules sweeping a 205,069-LOC Korean production monorepo (TalkUp). Cold scan 3 s, SQLite-cached re-scan 20 ms (150× faster).

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
**From 2026-08-02**, **providers** of AI systems (including general-purpose AI systems) serving the EU must mark outputs in a **machine-readable form**, and **deployers** who publish AI-generated text "for the purpose of informing the public on matters of public interest" face a separate disclosure obligation under Article 50(4). Korean (and other non-EU) businesses are in scope when they either supply generative AI into the EU or publish AI-generated content to EU audiences (generative AI placed on the EU market before 2026-08-02 has a **transitional period until 2026-12-02**). aicqtools auto-detects Claude Code/Cursor sessions and renders an AI-BOM (AI Bill of Materials — model/version/license manifest, CycloneDX 1.6 JSON) plus an Article 50 report (HTML or PDF).

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
#    Beta phase — `latest` tag points at beta, so no `@beta` suffix needed.
npm install --save-dev @aicqtools/cli
# Or explicitly:
npm install --save-dev @aicqtools/cli@beta
# To pin alpha:
# npm install --save-dev @aicqtools/cli@alpha

# 2. Scaffold aicq into your repo — config + CI workflow in one shot
npx aicq init --stack next   # or nest | capacitor | generic
# → writes aicq.config.yaml (stack-aware exclude/rule preset)
# → writes .github/workflows/aicq-check.yml (CI integration)

# 3. First check
npx aicq check --locale en
# Sample output:
# ✗ src/routes/api.ts:42  no-console-log  warning
#   → Avoid console.log in production code. Use a logger.
# ✗ src/db/schema.ts:18   no-plain-card-number  error
#   → Plaintext card_number column needs an _encrypted suffix (PCI DSS § 3.5.1).

# 4. Inject rules into your AI agents
npx aicq sync-ai-rules --locale en
# → .cursorrules / CLAUDE.md refreshed with the 50-rule summary
# → Claude Code/Cursor pick this context up on the next generation

# 5. (Optional) Capture an AI session — Article 50 readiness
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

### `reportUnusedSuppressions` (alpha.17+) — clean up stale suppression directives

When an `aicq-disable-line` / `aicq-disable-next-line` / `aicq-disable-file` directive matches zero violations, the runner emits an info-severity `@aicq/unused-suppression` diagnostic at the directive's comment line. Mirrors ESLint's `--report-unused-disable-directives`.

```yaml
reportUnusedSuppressions: true
```

```bash
aicq check --report-unused-suppressions     # one-off enable
aicq check --no-report-unused-suppressions  # force off
```

Default `false` (opt-in). Synthetic diagnostic, so you cannot disable it via `rules.@aicq/unused-suppression: off` — flip this flag (or the CLI option) instead.

### Per-rule options (alpha.14+) — tune the built-in hardcoded constants

Six built-in rules accept user-supplied `options` — defaults are bit-for-bit identical to alpha.13, so leaving the config alone keeps zero regression:

```yaml
modules:
  guardrail:
    rules:
      # alpha.14: allow-list for magic numbers (default = 11 entries)
      no-magic-number:
        options:
          allowedNumbers: ['0', '1', '-1', '2', '60', '3600', '86400']

      # alpha.15: which console methods to flag (default ['log'])
      no-console-log:
        options:
          flagMethods: ['log', 'debug', 'warn']

      # alpha.15: file path regexes the empty-catch rule should skip
      no-empty-catch:
        options:
          skipFilePatterns:
            - '[/\\](native-bridge|service-worker)\.[jt]sx?$'
            - '[/\\]sentry-wrapper\.ts$'

      # alpha.16: extend the Sequelize migration function allowlist (Knex / TypeORM etc.)
      camelcase-migration-column:
        options:
          migrationFunctions: ['createTable', 'addColumn', 'changeColumn', 'create_table']

      # alpha.16: PII regex source array (default = Korean RRN + card number)
      mask-pii-in-ai-prompt:
        options:
          piiPatterns:
            - '\b\d{6}-\d{7}\b'        # Korean RRN
            - '\b(?:\d[ -]?){15,16}\b' # card number
            - '\b[A-Z]\d{8}\b'         # passport number (user-added)

      # alpha.16: Python f-string SQL keyword allowlist (default 8 entries)
      no-fstring-sql:
        options:
          sqlKeywords: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE']
```

**Unknown option keys** (e.g. `allowedNumberz`) trigger a stderr warning and are ignored (`.strict()` zod schema). **Type violations** also warn on stderr and fall back to defaults — a bad config never aborts the scan.

Run `aicq docs build` to generate per-rule markdown with the full options table at `aicq-docs/rules/{en,ko}/<rule-id>.md`.

### YAML PatternRule options (alpha.18+) — framework consistency for YAML rules

Since alpha.18 YAML PatternRules (`.yaml` files) can also declare `options.defaults: Record<string, unknown>`. The runtime synthesizes a strict object schema from the defaults' keys so user overrides catch typo keys. Note that the query stays static — options don't substitute into the query string (dynamic-query PatternRules await a v1.0+ visitor extension).

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
| **2026-05 (current)** | **v1.0.0-beta.1** — alpha.7~19 (19 cycles) of accumulated assets formalized; framework freeze; dist-tag `latest`=beta |
| 2026-06~07 | Beta soak — external dogfood ≥ 2, npm DL ≥ 200/week, open P1 = 0 (see [ROADMAP.md](ROADMAP.md) gates G1~G4) |
| 2026-08-01 | v1.0 stable candidate — just before the EU AI Act Article 50 effective date |
| 2026-10~ | 1.1 — 5 additional Korean IT rules (Toss Payments idempotency, Kakao/Naver SDK init order, …), `aicq fix` autofix |
| 2026-Q4 | 1.2 — Korean LLM SDK rule pack (solar/HyperCLOVA), VS Code extension |

Full gates and non-goals: [ROADMAP.md](ROADMAP.md).

---

## Security / contributing / policies

- **Security disclosures** — [SECURITY.md](SECURITY.md) (48h ack / 14d triage / 30d patch SLA)
- **Contributing** — [CONTRIBUTING.md](CONTRIBUTING.md) (DCO sign-off + rule-authoring guide)
- **Code of Conduct** — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1)
- **Data-handling policy** — [docs/policy/data-handling.md](docs/policy/data-handling.md) (100% local execution, telemetry OFF, FSC/PIPA/ISMS-P posture)

---

## License

MIT — see [LICENSE](LICENSE). Bug reports and rule PRs welcome.
