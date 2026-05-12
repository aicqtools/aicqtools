# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Phase 1b finish ~2026-09-15)
- Split `@aicq/parse-failed` into `@aicq/parse-failed` + `@aicq/rule-error` once enough data accumulates on which path fails more often.
- Investigate the alpha.3 TalkUp `no-magic-number` 43,716-hit surge (frontend) — likely false-positive surge that wants a tighter heuristic.
- Cursor SQLite extraction: scope which workspace `state.vscdb` to read by matching `<hash>/workspace.json`'s `folder` URI against the cwd (currently best-effort, takes the most-recent DB regardless of project).
- `aicq rules suggest`: pattern-mining v2 — generalize literal arguments, dedupe near-equivalent shapes, optionally re-evaluate the user's own `rulesDir` rules.

---

## [v1.0.0-alpha.6] - 2026-05-12

Phase 1b feature drop: the two remaining `Planned (Phase 1b finish)` items land — Cursor `state.vscdb` prompt extraction and the `aicq rules suggest` rule-autocrafting prototype. No fixes to alpha.5; this is purely additive.

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.6
- `@aicqtools/rule-sdk` 1.0.0-alpha.6
- `@aicqtools/guardrail` 1.0.0-alpha.6
- `@aicqtools/provenance` 1.0.0-alpha.6
- `@aicqtools/cli` 1.0.0-alpha.6

### Added
- **Cursor `state.vscdb` prompt extraction (`CursorSessionReader`)** — replaces the detection-only stub. The reader opens Cursor's workspace `state.vscdb` (`ItemTable`) and global `state.vscdb` (`ItemTable` + `cursorDiskKV`) **read-only** via the `better-sqlite3` already used by `@aicqtools/core`'s incremental cache, probes the known chat-storage keys (`workbench.panel.aichat.view.aichat.chatdata`, `aiService.prompts`, `composer.composerData`, …), and normalizes four known JSON shapes (`aiService.prompts` flat list, `chatdata` tabs/bubbles, composer `conversation[]`, global `composerData:<id>` + split `bubbleId:<composerId>:<bid>` rows) into `AiSession` / `AiPromptRecord`. **Best-effort by design**: Cursor's schema shifts across versions, so any unrecognized/changed/corrupt payload degrades to the historical detection-only result (a single `cursor-detected-*` session, no prompts) and the reader **never throws** (per-file isolation policy). `aicq provenance capture --reader cursor|all` now surfaces real Cursor prompts in Article 50 / AI-BOM reports where the schema matches. (Korean: Cursor `state.vscdb`(SQLite)에서 AI 대화 → 프롬프트를 추출하도록 교체. 워크스페이스 + 글로벌 DB를 `better-sqlite3` readonly로 열어 알려진 chat key를 탐색하고 4가지 JSON shape를 정규화. 스키마 미인식·변경·손상 시 감지만 하고 절대 throw 하지 않음.)
- **`aicq rules suggest` — rule-autocrafting early prototype.** Scans the repo with all built-in rules (reusing the same `runProject` scan and `.aicq/cache.sqlite` cache as `aicq check`), ranks them by how many violations they would flag, and prints a paste-ready `aicq.config.yaml` enable-snippet plus 1–2 sample violation locations per rule. A "detected stack" section reads `package.json` / `requirements.txt` (no AST) and labels built-in rules whose id/docs/message mentions a declared dependency (`stack match`). With `--patterns`, it additionally mines the AST for frequently-occurring `new X(...)` / `obj.method(...)` shapes and emits **draft** tree-sitter pattern rules (`severity: info`, `message`/`messageKo` are TODO placeholders, every generated query is compiled against the grammar before being emitted) — seeds a human edits, not finished rules. Output formats: `text` (default, human summary), `json` (`RuleSuggestionReport`), `yaml` (config snippet + draft rules). Options: `--top`, `--min-hits`, `--patterns`, `--min-pattern-count`, `--no-cache`, `--locale`, `-o/--output`. The command is advisory — it never enables rules or writes to `aicq.config.yaml` itself. New i18n keys `cli.rules.suggest.*` (ko/en). New `@aicqtools/guardrail` exports: `analyzeRepo`, `minePatterns`, `buildConfigSnippet`, `formatSuggestText`, `formatSuggestYaml` + their report types. (Korean: 저장소를 내장 룰로 스캔해 적중 순으로 순위 + 붙여넣기용 config 스니펫 + 샘플 위치를 출력하고, `package.json`/`requirements.txt` 의존성을 감지해 스택 매치 룰을 표시. `--patterns`로 AST 패턴을 채굴해 tree-sitter query YAML 룰 초안을 생성 — 사람이 다듬는 씨앗. 어떤 룰도 자동 활성화하지 않음.)
- Test coverage: provenance `session-readers.test.ts` gains SQLite-fixture cases for the new reader (`ItemTable` chatdata, `aiService.prompts`, broken-payload fallback, global `cursorDiskKV` inline + split-bubble) plus `getCursorGlobalStorageDir`; new `modules/guardrail/src/__tests__/suggest.test.ts` (analyzeRepo ranking + stack detection + top/minHits, minePatterns drafting + minCount, formatters) with a `fixtures/suggest-repo/` mixed TS+Python fixture; new `packages/cli/src/__tests__/rules-suggest.test.ts` (exit code, text/json/yaml output, `--output` file write).

### Changed
- `@aicqtools/provenance` adds `better-sqlite3` (`^11.7.0`, the same pin `@aicqtools/core` already ships) as a direct dependency + `@types/better-sqlite3` as a dev dependency. No root `pnpm.onlyBuiltDependencies` change — `better-sqlite3` is already listed.
- `@aicqtools/provenance` now publicly exports `getCursorGlobalStorageDir` and `normalizeCursorChat` alongside the existing `getCursorWorkspaceStorageDir` / `CursorSessionReader`.

---

## [v1.0.0-alpha.5] - 2026-05-12

Hotfix on top of alpha.4 that resolves the multi-`tree-sitter` native-instance collision uncovered by the TalkUp alpha.4 dogfood. alpha.4 dist code is unchanged in alpha.5 — only `package.json` dependency structure and a small diagnostic improvement.

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.5
- `@aicqtools/rule-sdk` 1.0.0-alpha.5
- `@aicqtools/guardrail` 1.0.0-alpha.5
- `@aicqtools/provenance` 1.0.0-alpha.5
- `@aicqtools/cli` 1.0.0-alpha.5

### Fixed
- **`parser failed: SyntaxNode must belong to a Tree` (.ts files only, YAML pattern rules)** — when `@aicqtools/cli` was installed into a non-pnpm-workspace project, npm's peer-resolution logic hoisted `tree-sitter@0.21.1` to the user root (to satisfy `tree-sitter-typescript`'s `peerOptional ^0.21`) while each aicq package nested its own `tree-sitter@0.22.4`. Up to four native binding instances coexisted in the same V8 isolate; the `Parser.Tree` created by `@aicqtools/core` and the `Parser.Query` constructed inside `@aicqtools/guardrail` came from different instances, and typescript-grammar's strict node identity check rejected the cross-instance call. TalkUp's alpha.4 scan surfaced 329 occurrences across 3 modules (admin 70 / frontend 219 / backend 40, all `.ts`). Fixed by promoting `tree-sitter` / `tree-sitter-typescript` / `tree-sitter-python` to `peerDependencies` in `@aicqtools/core`, `@aicqtools/guardrail`, `@aicqtools/rule-sdk`, and declaring them as direct `dependencies` of `@aicqtools/cli` so the user-facing install hoists a single shared copy.
- **`@aicq/parse-failed` warning now names the offending rule** — rule-level `try/catch` was added in `runFileWithSource`, so a single misbehaving rule no longer hides as `parser failed: ...`. Messages read `parser failed in rule <ruleId>: <cause>` (Korean: `파서 실패 (룰 <ruleId>): <cause>`). The file-level parse path keeps the prior wording with a `during file parse` qualifier.

### Changed
- `@aicqtools/core`, `@aicqtools/guardrail`, `@aicqtools/rule-sdk`: tree-sitter native deps moved from `dependencies` to `peerDependencies` (non-optional). All three publish `peerDependenciesMeta` with `optional: false` to make the requirement explicit.
- `@aicqtools/cli`: `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-python` added as direct `dependencies` so end-user `npm i @aicqtools/cli` / `pnpm add @aicqtools/cli` auto-hoists a single shared instance without manual user action.
- Workspace root `package.json` adds `pnpm.overrides.tree-sitter: ~0.22.4` to enforce single `tree-sitter@0.22.4` resolution during local dev / CI.

### Added
- `e2e/install-isolation/run-bisect.mjs` + `README.md` — CI hard-gate that `npm install`s the freshly packed CLI into a clean tempdir, asserts exactly one `tree-sitter` package copy is hoisted, and runs the 4-YAML-rule bisect on a synthetic `.ts` source to confirm zero `@aicq/parse-failed`. Wired into `.github/workflows/aicq-check.yml`.
- `modules/guardrail/src/__tests__/runner.test.ts` — rule-level error isolation describe block (D-axis), confirming a single broken rule emits `@aicq/parse-failed` with the offending ruleId embedded and other rules keep running.

### Investigation notes
The first alpha.5 hypothesis ("parseSource Parser lifetime / loadLanguage double-lookup") was disproved by a five-stage reproducer chain: a synthetic probe passed 40/40, real TalkUp `.ts` files passed 32/32 with direct tree-sitter calls, an aicq-call-sequence verbatim mimic passed 24/24, and only the aicq dist path under the alpha.4 install layout failed — narrowing the defect to native instance multiplicity rather than code-level lifetime. The `parseSource` API and `runRule` signature are unchanged in alpha.5. See `~/.claude/plans/aicqtools-alpha4-bug-yaml-rules-ts.md` §5.5 for the full chain.

### Workaround for users still on alpha.4
Add `"overrides": { "tree-sitter": "0.22.4" }` to your project's root `package.json` (pnpm: `"pnpm": { "overrides": { ... } }`, yarn: `"resolutions"`), then reinstall. Verified to produce the same single-instance result as the alpha.5 fix.

---

## [v1.0.0-alpha.4] - 2026-05-12

Hotfix on top of alpha.3 that resolves both known limitations called out in the alpha.3 release notes.

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.4
- `@aicqtools/rule-sdk` 1.0.0-alpha.4
- `@aicqtools/guardrail` 1.0.0-alpha.4
- `@aicqtools/provenance` 1.0.0-alpha.4
- `@aicqtools/cli` 1.0.0-alpha.4

### Fixed
- **`parser failed: SyntaxNode must belong to a Tree`** — alpha.3's `parserCache` kept one `Parser` per language for the whole run. Under `tree-sitter@~0.22.4` the native binding strict-binds `Parser` ↔ `Tree`, so reparsing through the same `Parser` invalidates earlier trees' `SyntaxNode`s and `Parser.Query.matches` throws on them. TalkUp's alpha.3 scan surfaced 329 occurrences across the three modules (admin 70 / frontend 219 / backend 40). Fixed by removing `parserCache` entirely so every `parseSource` call allocates a fresh `Parser`.
- **`aicq --version` printed `0.0.0`** — the value passed to commander was hardcoded, and the same placeholder leaked into SARIF `tool.driver.version` and CycloneDX `metadata.tools[0].version`. A new `packages/cli/src/version.ts` reads the version from the CLI's own `package.json` via the ESM `dirname(fileURLToPath(import.meta.url))` pattern (same approach used by `modules/guardrail/src/rules-default/index.ts`), walks up at most six levels until it finds the `@aicqtools/cli` package, and caches the result.

### Changed
- `@aicqtools/core` now publicly exports `loadLanguage(lang)` so callers (notably `runPatternRule` in `@aicqtools/guardrail`) can resolve a `Parser.Language` without allocating a `Parser` per call.
- `packages/cli/src/commands/check.ts` and `packages/cli/src/commands/provenance.ts` now inject the real CLI version into `reportSarif(result, version)` and `emitAiBom(record, version)`. The defaults in `@aicqtools/core` (`reportSarif`) and `@aicqtools/provenance` (`emitAiBom`) keep `'0.0.0'` as a defensive fallback for direct programmatic callers.

### Added
- `packages/core/src/__tests__/parser.test.ts` — regression case that parses 4 distinct TypeScript sources sequentially and asserts each prior `rootNode` stays queryable.
- `modules/guardrail/src/__tests__/runner.test.ts` — regression case that runs the same YAML pattern rule against 25 distinct files in one test, asserting no throw.
- `packages/cli/src/__tests__/version.test.ts` — asserts `getCliVersion()` returns the version in `packages/cli/package.json` and matches `1.0.0-alpha.4`.

---

## [v1.0.0-alpha.3] - 2026-05-12

Hotfix release for the alpha.2 blocker that prevented `aicq check` from running on React/Next projects with files ≥ 32,768 bytes. Adds per-file isolation, regression fixtures, and a clearer CLI error path.

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.3
- `@aicqtools/rule-sdk` 1.0.0-alpha.3
- `@aicqtools/guardrail` 1.0.0-alpha.3
- `@aicqtools/provenance` 1.0.0-alpha.3
- `@aicqtools/cli` 1.0.0-alpha.3

### Fixed
- **Windows tree-sitter 32KB+ blocker** — `tree-sitter@0.21.1` Windows prebuilt native binding rejected inputs of length ≥ 2^15 with `Error: Invalid argument`, aborting whole-project checks on the first oversized file (e.g. `frontend_admin/src/components/characters/CharacterForm.tsx` at 49,961 bytes in the TalkUp case). Resolved by upgrading to `tree-sitter@~0.22.4`; the offending size threshold no longer applies.

### Changed
- **tree-sitter line unified across the workspace.** `@aicqtools/core`, `@aicqtools/guardrail`, `@aicqtools/rule-sdk` all now depend on `tree-sitter@~0.22.4` (was `~0.21.1`). `tree-sitter-python` bumped `~0.21.0` → `~0.23.6` (peer-compatible with 0.22.x). `tree-sitter-typescript@~0.23.2` unchanged (peer warning is accepted; runtime API is unchanged across 0.21→0.22).
- **Per-file isolation in `runProject`** — a parser crash or rule throw on one file now produces a single `@aicq/parse-failed` `warning` diagnostic and the scan continues. Previously a single failure aborted the entire run. Failed files are deliberately not cached, so the next run after a fix retries them.
- **Better CLI error context** — fatal parser failures that escape isolation now print `aicq: parser failed on <file>: <cause>` via the new `ParserError` export from `@aicqtools/core`. Localized via the new `cli.check.parserFailed` i18n key (ko/en).
- **Docs** — Rewrote root [README.md](README.md) / [README.en.md](README.en.md) and added new [packages/cli/README.md](packages/cli/README.md) / [README.en.md](packages/cli/README.en.md) with a beginner-first "Why → What → How" structure. Glossary is now inlined (deterministic, MCP, SARIF, AI-BOM, Article 50 are defined where they first appear). (Carried from the alpha.2 Unreleased section.)

### Added
- **Large-file regression fixture** — new `e2e/large-file-fixture/` generates valid TSX/TS/Python files at 32K / 50K / 100K bytes and asserts `parseSource()` returns a clean tree without throwing.
- **CI hard gate** — `.github/workflows/aicq-check.yml` runs the large-file regression step with no `continue-on-error`; a future tree-sitter regression on large inputs fails CI immediately.
- **vitest large-input cases** — `parseSource` now has 12 new unit tests (typescript / tsx / javascript / python × 32K / 50K / 100K) protecting the same surface from the test side.
- **Test coverage growth** — guardrail 127 → 130 (per-file isolation), core 27 → 41 (large inputs + SARIF + i18n), cli 0 → 3 (`ParserError` handling). Provenance 30 (2 skipped on machines without Chrome).

### Internal
- `packages/core/src/parser/tree-sitter.ts` — narrowed `loadLanguage` return type from `unknown` to `Parser.Language` to satisfy stricter 0.22.x typings.
- `modules/provenance/src/__tests__/article-50-pdf.test.ts` — gate PDF/launch tests on a real Chrome probe (not just module presence), so dev/CI machines without browsers installed cleanly skip.

---

## [v1.0.0-alpha.2] - 2026-05-08

Phase 1b in-progress release. Bundles every change since `v1.0.0-alpha.1`: provenance native readers, Article 50 HTML/PDF renderers, the 13-rule Korean compliance ruleset (50 rules total), TalkUp case study, community launch drafts, Claude Code model extraction, and PCI DSS / FSC AI § references in rule messages. **First publish to npm under `@aicqtools/*` scope.**

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.2
- `@aicqtools/rule-sdk` 1.0.0-alpha.2
- `@aicqtools/guardrail` 1.0.0-alpha.2
- `@aicqtools/provenance` 1.0.0-alpha.2 (with optional `puppeteer` peer for PDF)
- `@aicqtools/cli` 1.0.0-alpha.2 (`aicq` binary)

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

**E1 enhancement — Claude Code model extraction**
- `ClaudeCodeSessionReader` now reads `message.model` from assistant entries (e.g., `claude-opus-4-7`) and propagates it to `AiSession.model`. Falls back to `'unknown'` only when no assistant entry has a `model` field.
- Article 50 / AI-BOM reports now reflect the actual model rather than `unknown`.
- New unit test exercises both the extracted-model path and the fallback path.

**K2 §-mapping — explicit clause references in rule messages**
- All 13 K2 rule messages now cite specific clauses:
  - **PCI DSS** (8 rules): `no-plain-card-number` § 3.5.1 / `no-cvv-logging` § 3.3.1 / `require-tls-1-2-plus` § 4.2.1 / `verify-pg-response` § 6.2.4 / `require-idempotency-key` § 10.2 alignment / `separate-refund-permission` § 7.2 / `preserve-transaction-log` § 10.2 / `mask-card-number` § 3.4.1
  - **FSC AI guideline** (5 rules): `audit-log-ai-decision` (auditability / 감사 추적성) / `mask-pii-in-ai-prompt` (privacy / 개인정보 보호) / `track-ai-model-version` (model governance / 모델 거버넌스) / `human-oversight-checkpoint` (human-in-the-loop / 인간 개입 포인트) / `ai-explainability-metadata` (explainability / 설명가능성)
- Messages remain bilingual (`message` + `messageKo`) and ship in the auto-generated rule docs.

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

[Unreleased]: https://github.com/aicqtools/aicqtools/compare/v1.0.0-alpha.6...HEAD
[v1.0.0-alpha.6]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.6
[v1.0.0-alpha.5]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.5
[v1.0.0-alpha.4]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.4
[v1.0.0-alpha.3]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.3
[v1.0.0-alpha.2]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.2
[v1.0.0-alpha.1]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.1
