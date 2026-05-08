# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Phase 1b ~2026-09-15)
- 13 additional rules — 5 FSC AI guideline mappings + 8 PCI DSS payment rules → 50 total
- Provenance tracker — Claude Code session.jsonl native reader (E1)
- Provenance tracker — Cursor session capture (E2)
- EU AI Act Article 50 PDF renderer (E3)

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
