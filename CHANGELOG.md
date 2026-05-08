# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 1b in progress

**Provenance — session readers (E1 + E2)**
- `SessionReader` abstraction with pluggable backends (`ManualSessionReader`, `ClaudeCodeSessionReader`, `CursorSessionReader`, `CompositeSessionReader`)
- **Claude Code native reader** (E1) — parses `~/.claude/projects/<encoded-cwd>/*.jsonl`, extracts user prompts, skips `<ide_opened_file>` / `<system-reminder>` fragments, sorts sessions by mtime
- **Cursor detection reader** (E2, beta-lite scope) — detects Cursor usage via `state.vscdb` in workspaceStorage (Win/macOS/Linux); full prompt extraction lands in v1.0 stable when SQLite schema is finalized
- `aicq provenance capture --reader <manual|claude-code|cursor|all>` flag (default `manual` for backward compatibility)

**Provenance — Article 50 HTML renderer (E3)**
- `aicq provenance report --format article-50-html [--locale ko|en]` — Korean / English bilingual, XSS-safe escaping, print-friendly CSS with Korean system-font fallback chain

**Provenance — Article 50 PDF renderer (E3 PDF)**
- `aicq provenance report --format article-50-pdf --output <path> [--locale ko|en]` — pixel-perfect PDF via puppeteer, reuses the HTML template
- `puppeteer` is an **optional peer dependency** — default install does not download Chromium (~200 MB). Users opt in with `pnpm add puppeteer` when they need the PDF format
- Friendly error message points to `docs/pdf-rendering.md` when puppeteer is missing
- Programmatic API: `renderArticle50Pdf(report, { locale, format, margin })`

**TalkUp case study (K3)**
- `docs/case-studies/talkup-30k.md` (한국어), `talkup-30k.en.md` (English) — applying the 50-rule guardrail to a 205,069 LOC Korean production monorepo (anonymized)
- Documents the seven recurring AI vibe-coding patterns the ruleset was bootstrapped from, mapped to specific rules
- 5 of 7 cases detected on first pass — the two variant patterns (`no-id-overwrite`, `fk-needs-on-delete`) document v1.5 precision improvements
- `examples/talkup-mirror/src/talkup-cases.ts` — anonymized verification samples that `aicq check` flags

**Korean community launch drafts (E4-A)**
- `docs/marketing/geeknews-launch.md` — GeekNews HN-style post (short + impact, 2 length variants)
- `docs/marketing/okky-launch.md` — OKKY discussion-style post (~1000자, Q&A bait)
- `docs/marketing/velog-launch.md` — Velog long-form technical blog (3000~5000자, code + analysis)
- `docs/marketing/README.md` — posting order, key messages, predicted Q&A templates
- All drafts target user-driven publishing (no auto-posting bots), staged sequence Mon→Wed→Fri

**Korean compliance ruleset (K2) — 13 rules → 50 rules total**

FSC AI guideline (5):
- `audit-log-ai-decision` — every AI inference must produce an audit log entry
- `mask-pii-in-ai-prompt` — block Korean RRN / 16-digit card numbers from reaching LLM providers
- `track-ai-model-version` — `openai.chat.completions.create` / `anthropic.messages.create` calls must specify `model:`
- `human-oversight-checkpoint` — AI results persisted to DB must carry a review marker
- `ai-explainability-metadata` — AI-derived API responses should expose reasoning / sources / model

PCI DSS (8):
- `no-plain-card-number` — schema columns named `card_number` / `cardNumber` must carry an encryption suffix
- `no-cvv-logging` — CVV/CVC must never appear in `console.log` / `logger.*` arguments
- `require-tls-1-2-plus` — block `TLSv1` / `TLSv1.1` in `secureProtocol` / `minVersion`
- `verify-pg-response` — payment-gateway HTTP responses must be signature/hash-verified
- `require-idempotency-key` — `pay*` / `charge*` / `payment*` functions must include an idempotency key
- `separate-refund-permission` — `refund*` functions must check role/permission before invocation
- `preserve-transaction-log` — payment/refund functions must produce an audit log entry (PCI DSS § 10)
- `mask-card-number` — `cardNumber` rendered without `mask*` / `last4*` helpers is flagged

All 13 rules are heuristic-based (beta) — false positives are possible and severity defaults can be adjusted via `aicq.config.yaml`. 31 new unit tests (fsc-ai: 12, pci-dss: 19); guardrail tests 96 → 127, regression 0.

### Planned (Phase 1b finish ~2026-09-15)
- EU AI Act Article 50 PDF renderer (HTML → PDF)
- Cursor SQLite-aware prompt extraction (replace current detection-only stub)
- FSC AI / PCI DSS § references in rule messages (currently generic)

### Planned (Phase 2 ~2026-10-27)
- v1.5 cloud SaaS beta — dashboard, PR auto-comment, Stripe billing
- typescript-eslint optional module (type-aware rules)

---

## [v1.0.0-alpha.1] - 2026-05-08

First public alpha. The guardrail engine + provenance scaffold are functional and dogfooded against TalkUp; OSS publication infrastructure (LICENSE, contribution guides, GitHub templates) is in place.

### Added — Phase 0 PoC (`c13eb8e`)
- Monorepo (pnpm + turborepo) with `packages/{core,cli,rule-sdk}` and `modules/{guardrail,provenance,supply-chain}`
- tree-sitter parser adapter (TypeScript + Python)
- Unified `aicq.config.yaml` schema with `modules.{guardrail,provenance,supplyChain}` namespaces
- SARIF 2.1.0–compatible diagnostic interface
- Hybrid rule DSL — YAML S-expression patterns + JS/TS function rules (`defineRule()`)
- 8 built-in rules covering the TalkUp dogfooding cases (no-direct-openai, no-console-log, no-id-overwrite, route-needs-rate-limit, controller-needs-async-wrapper, fk-needs-on-delete, api-response-shape, no-inline-math-round)
- MCP stdio server skeleton for Claude Code / Cursor
- sqlite incremental cache (better-sqlite3)
- `aicq sync-ai-rules` command — auto-injects rules into `.cursorrules` and `CLAUDE.md`
- Provenance tracker scaffold — Git pre-commit capture, CycloneDX 1.6 AI-BOM emitter, EU AI Act Article 50 report builder

### Added — Phase 0 Wrap-up (`509c33a`)
- User rule directory loading (`loadFunctionRulesFromDir()`) end-to-end
- Benchmark suite — 10k LOC scan in **1,393ms cold / 6ms warm** (target 5,000ms / 1,000ms)
- Provenance e2e demo — `aicq provenance capture` + `report --format article-50` / `--format ai-bom`
- MCP Claude Code setup guide ([docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md))
- EU AI Act Article 50 + Annex IV data requirements analysis ([docs/eu-ai-act-data-requirements.md](docs/eu-ai-act-data-requirements.md))
- Branding candidates research → organization renamed `@aicq/*` → `@aicqtools/*` ([docs/branding-candidates.md](docs/branding-candidates.md))

### Added — S2 + S1 (`99944b4`)
- `packages/action/` — Composite GitHub Action with `aicq check` runner
- `.github/workflows/aicq-check.yml` — self-dogfood workflow (PR + main push)
- pre-commit hook setup guide for husky + lefthook ([docs/pre-commit-setup.md](docs/pre-commit-setup.md))
- TalkUp mirror husky integration as a live demo

### Added — S3 + K1 (`608fac4`)
- 12 TypeScript global rules — no-direct-anthropic, no-inline-date, no-bare-throw, no-empty-catch, no-process-env-leak, route-needs-auth, no-magic-number, no-default-export-from-libs, prefer-const-array, no-boolean-trap, prefer-named-imports, no-jsonb-circular
- 10 Python global rules — requests-needs-timeout, no-pickle, no-shell-true, no-fstring-sql, no-mutable-default-arg, no-print-in-prod, no-bare-except, type-hint-required-public, async-await-consistency, pytest-fixture-naming
- 7 Korean IT convention rules (Phase 1a beta) — camelcase-migration-column, enforce-utf8-encoding, explicit-kst-timezone, won-format-thousands, rfc5987-korean-filename, naver-kakao-oauth-webview, korean-comment-encoding
- Ruleset growth: 8 → 37 rules
- Test coverage: 53 → 96 unit tests

### Added — S4 (`4de1264`)
- `packages/core/src/i18n/` — locale resolver (priority: `--locale` > `LC_ALL`/`LANG` > `aicq.config.yaml` > `'en'`), message dictionary (ko/en, 9 keys), `t()` helper with placeholder substitution
- All CLI commands now respect locale: `check`, `sync-ai-rules`, `provenance capture`, `docs build`
- New `aicq docs build` command — auto-generates per-rule markdown for both locales (78 files for the 37-rule set)
- Astro docs site at `apps/docs/` — `/ko/`, `/en/` routing with home, install, and rules index pages
- `README.md` (Korean primary) + `README.en.md` (English) split

### Performance
- Cold-cache scan of 10k LOC with 37 rules: **3,003ms** (60% of the 5s budget)
- Warm-cache scan: **20ms** (sqlite incremental cache hit)
- Speedup: 150× warm vs cold

### Infrastructure
- GitHub organization `aicqtools` created and `aicqtools/aicqtools` repo published (private)
- Native build dependencies whitelisted via `pnpm.onlyBuiltDependencies` (tree-sitter, better-sqlite3, esbuild)
- All workspace `test` scripts use `vitest run --passWithNoTests` for empty packages

### Known limitations (alpha)
- Korean convention rules use heuristics — false positives are possible. Precision improves with community feedback after release.
- Provenance capture relies on a manually-maintained `.aicq/sessions.json` (Phase 0 PoC); native Claude Code / Cursor session readers land in Phase 1b.
- The Astro docs site is functional but minimal (Phase 1a PoC); search, dark mode, and per-rule import from `aicq docs build` arrive in Phase 1b.
- `aicq.config.yaml` rule overrides are schema-supported but the runtime override path is not yet exercised in tests.
- npm packages are **not yet published** — install from local workspace only. Public `npm publish` is scheduled for the v1.0 release.

[Unreleased]: https://github.com/aicqtools/aicqtools/compare/v1.0.0-alpha.1...HEAD
[v1.0.0-alpha.1]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.1
