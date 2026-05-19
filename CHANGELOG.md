# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Phase 1b finish ~2026-09-15)
- Split `@aicq/parse-failed` into `@aicq/parse-failed` + `@aicq/rule-error` once enough data accumulates on which path fails more often.
- Cursor SQLite extraction: scope which workspace `state.vscdb` to read by matching `<hash>/workspace.json`'s `folder` URI against the cwd (currently best-effort, takes the most-recent DB regardless of project).
- `aicq rules suggest`: pattern-mining v2 — generalize literal arguments, dedupe near-equivalent shapes, optionally re-evaluate the user's own `rulesDir` rules. Also: emit `overrides:` recommendations alongside the existing `rules:` map.
- Per-rule options framework — migrate remaining built-in rules (`no-console-log`, `no-empty-catch`, korean/python/pci/fsc) to `RuleMeta.options` so users can tune each rule's hardcoded constants. Alpha.14 shipped the framework + first migration (`no-magic-number.allowedNumbers`).
- Nested `.gitignore` / dedicated `.aicqignore` support. Alpha.9 honors only the root `.gitignore` (auto-on by default).
- `@aicq/unused-suppression`: an info-severity diagnostic when an `aicq-disable-*` directive matched zero diagnostics (mirrors ESLint's `--report-unused-disable-directives`).
- Line-level `.gitignore` parse-error logging (`aicq: .gitignore line N could not be parsed`). Alpha.9 silently tolerates unparseable lines; the next sweep should surface them on stderr for debuggability.
- `--overrides` CLI flag for one-off path-rule application without writing `aicq.config.yaml`. Alpha.10 ships `overrides:` as a config-only feature.
- Broader auto-distinction of "real source under `public/`" beyond the Capacitor `native-bridge.js` / PWA `service-worker` conventions that alpha.10 already skips (e.g. wildcard `*-bridge.{js,ts}`, bare `sw.{js,ts}`) — needs more dogfood data to avoid false-positive silent skips.
- `overrides.anchoring: 'auto' | 'strict'` opt-out if alpha.10 dogfood surfaces unexpected match growth. Alpha.10 ships `'auto'` as the only behavior.

---

## [v1.0.0-alpha.14] - 2026-05-19

### 🇰🇷 한국어

알파.13의 `RuleContext.skipBuiltinSkips` first instance를 일반화한 **per-rule options framework**. 룰이 zod schema + defaults를 self-declare하면 사용자가 `aicq.config.yaml`의 `rules: { <id>: { options: {...} } }`로 룰별 옵션을 조정할 수 있고, runner는 schema validation → `RuleContext.options` plumbing → 캐시 hash 합류까지 자동 처리. 첫 마이그레이션 사례로 `no-magic-number.allowedNumbers`를 적용 — 사용자가 프로젝트 고유 허용 숫자(16진수, 시간 단위 등)를 추가할 수 있게 함. **기본값 = 무옵션 = 알파.13 동작과 비트 단위 동일**, dogfood 카운트 회귀 0. BREAKING 아님 — `RuleMeta.options` / `RuleContext.options` / config 객체 shape 모두 옵셔널.

#### 게시된 패키지 (5)
- `@aicqtools/core` 1.0.0-alpha.14
- `@aicqtools/rule-sdk` 1.0.0-alpha.14
- `@aicqtools/guardrail` 1.0.0-alpha.14
- `@aicqtools/provenance` 1.0.0-alpha.14
- `@aicqtools/cli` 1.0.0-alpha.14

#### 추가
- **`RuleMeta.options?` 필드** (`@aicqtools/rule-sdk`). 룰이 `{ schema: ZodTypeAny; defaults: Readonly<Record<string, unknown>> }`로 옵션 surface self-declare. zod는 type-only import + `peerDependenciesMeta.zod.optional: true` — 옵션 미사용 룰은 zod 불필요. 외부 룰 작성자 backward-compat 0.
- **`RuleContext.options?` 필드**. 룰 본체가 `ctx.options as MyOptions ?? DEFAULTS` 패턴으로 읽음. 옵셔널이라 알파.13 외부 사용자 룰 그대로 컴파일.
- **`aicq.config.yaml` `rules` map의 객체 shape** (`@aicqtools/core`). 기존 `rules: { foo: 'off' }` 외에 `rules: { foo: { severity: 'warn', options: { ... } } }`를 union으로 허용. `.strict()`로 오타 키(`severityy`, `option`) 캐치. `overrides[].rules`도 동일 패턴. 기존 string shape는 union의 한 갈래로 그대로 파싱 (back-compat).
- **`resolveRuleOptions` 헬퍼** (`@aicqtools/guardrail`). 룰의 zod schema로 사용자 옵션을 `safeParse` → defaults와 merge → unknown keys + parse error 수집. 실패 시 defaults fallback (run never crashes).
- **`applyRuleConfig` 확장 + 신규 `applyOverridesForFileResolved`**. 사이드 맵 `ruleOptions: ReadonlyMap<string, ...>`로 Rule immutability 유지. `applyOverridesForFile` 알파.8 시그니처는 그대로 보존 (기존 호출자 회귀 0). Per-file 옵션 layering = global → overrides[i] (last-write-wins).
- **`no-magic-number.allowedNumbers` 옵션** — 알파.13 11개 default(`['0', '1', '-1', '2', '-2', '10', '16', '24', '60', '100', '1000', '1024']`)를 zod schema default로 옮김. 사용자가 좁히거나 늘릴 수 있음. `aicq rules suggest` 출력 + `aicq docs build` 자동 생성 docs에 옵션 표 포함.
- **CLI stderr 경고** — 알 수 없는 옵션 키(`cli.check.unknownRuleOptionKey`)와 zod 파싱 실패(`cli.check.ruleOptionParseError`) 각각 한 줄. exit code 미변경 (알파.7 unknownIds 패턴 일관). i18n en/ko 양쪽.
- **Docs render 확장** — `renderRuleMarkdown`이 `rule.options`를 zod schema introspection으로 `## Options` (en) / `## 옵션` (ko) 섹션 자동 생성. `key | type | default` 표 + 예제 yaml.
- **신규 테스트 11건**: guardrail 8건 (`rule-options.test.ts` 6 + `apply-rule-config.test.ts` +2: union shape 객체형 / back-compat 'off') + cli 3건 (`rule-options-cli.test.ts` — config 객체 shape / unknown key stderr / zod fallback).

#### 검증
- `pnpm -w build` / `typecheck` / `test` Windows 11에서 모두 green.
- Guardrail 테스트: 알파.13 258 + 신규 8 = 266. CLI 테스트: 알파.13 29 + 신규 3 = 32. 회귀 0.
- 알파.12 메타-실코드 동일성 가드 + 알파.13 `skipBuiltinSkips` 매트릭스 모두 그대로 통과 — `SKIP_FILE_RE` 패턴 / `skipPatterns` 메타 미접촉.
- 실 프로젝트 도그푸드 예상(TalkUp 알파.12 baseline frontend 742 / backend 2,865 / admin 179, `no-magic-number` 옵션 미설정) — 기본값 그대로라 카운트 0 delta.
- 알파.9 `respectGitignore` / 알파.10 `overrides.anchoring: 'auto'` / 알파.11 negation 경고 / 알파.12 paste-ready 가드 / 알파.13 `skipBuiltinSkips` — 본 PR에서 미접촉.

---

### 🇬🇧 English

Generalization of alpha.13's `RuleContext.skipBuiltinSkips` first instance into a full **per-rule options framework**. Rules self-declare a zod schema + defaults via `RuleMeta.options`, and users tune them through `aicq.config.yaml`'s `rules: { <id>: { options: {...} } }` object shape. The runner handles schema validation, plumbs resolved values into `RuleContext.options`, and folds option hashes into the cache key automatically. First migration: `no-magic-number.allowedNumbers` — users can now extend the 11-number allowlist with project-specific constants (hex, time units, etc.). **Default behavior = no options = bitwise-identical to alpha.13**, dogfood counts unchanged. Not BREAKING — `RuleMeta.options`, `RuleContext.options`, and the new config object shape are all optional.

#### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.14
- `@aicqtools/rule-sdk` 1.0.0-alpha.14
- `@aicqtools/guardrail` 1.0.0-alpha.14
- `@aicqtools/provenance` 1.0.0-alpha.14
- `@aicqtools/cli` 1.0.0-alpha.14

#### Added
- **`RuleMeta.options?` field** (`@aicqtools/rule-sdk`). Rules self-declare option surface via `{ schema: ZodTypeAny; defaults: Readonly<Record<string, unknown>> }`. Zod is a type-only import + `peerDependenciesMeta.zod.optional: true` so rules without options never pull zod in. External rule author backward-compat: 0 impact.
- **`RuleContext.options?` field**. Rule bodies read `ctx.options as MyOptions ?? DEFAULTS`. Optional, so existing external rules from alpha.13 compile unchanged.
- **`aicq.config.yaml` object shape for `rules`** (`@aicqtools/core`). The legacy `rules: { foo: 'off' }` string shape is now union'd with `rules: { foo: { severity: 'warn', options: { ... } } }`. `.strict()` catches typos in the top-level keys. `overrides[].rules` follows the same pattern. Existing string-shape configs parse via the union's first branch (back-compat).
- **`resolveRuleOptions` helper** (`@aicqtools/guardrail`). Runs the rule's zod schema in `safeParse` mode, merges with defaults, and collects unknown keys + parse errors. On failure, returns defaults — the runner never crashes on a broken option config.
- **`applyRuleConfig` extended + new `applyOverridesForFileResolved`**. Resolved options live in a side map (`ruleOptions: ReadonlyMap<string, ...>`) so the `Rule` objects stay immutable. The alpha.8 `applyOverridesForFile` signature is preserved verbatim — existing callers see zero regression. Per-file layering = global → overrides[i] (last-write-wins).
- **`no-magic-number.allowedNumbers` option** — the alpha.13 default list (`['0', '1', '-1', '2', '-2', '10', '16', '24', '60', '100', '1000', '1024']`) is now exposed as a zod schema default. Users can shrink or extend it. `aicq rules suggest` and the auto-generated docs (`aicq docs build`) both surface the options table.
- **CLI stderr warnings** — unknown option keys (`cli.check.unknownRuleOptionKey`) and zod parse failures (`cli.check.ruleOptionParseError`) each emit one line. Exit code stays 0 (consistent with the alpha.7 unknownIds pattern). i18n en/ko both included.
- **Docs render extension** — `renderRuleMarkdown` introspects `rule.options` via zod and renders `## Options` (en) / `## 옵션` (ko) with a `key | type | default` table + example YAML.
- **Eleven new tests**: guardrail ×8 (`rule-options.test.ts` ×6 + `apply-rule-config.test.ts` +2: union object shape / back-compat `off`) + cli ×3 (`rule-options-cli.test.ts` — config object shape / unknown key stderr / zod fallback).

#### Verification
- `pnpm -w build` / `typecheck` / `test` all green on Windows 11.
- Guardrail tests: alpha.13 258 + 8 new = 266. CLI tests: alpha.13 29 + 3 new = 32. 0 regressions.
- Alpha.12 meta-vs-code equality guard and alpha.13 `skipBuiltinSkips` matrix all still pass — `SKIP_FILE_RE` patterns and `skipPatterns` meta are untouched.
- Real-project dogfood expected (TalkUp alpha.12 baseline frontend 742 / backend 2,865 / admin 179, `no-magic-number` options unset): counts unchanged because the defaults preserve alpha.13 behavior.
- Alpha.9 `respectGitignore` / alpha.10 `overrides.anchoring: 'auto'` / alpha.11 negation warning / alpha.12 paste-ready guard / alpha.13 `skipBuiltinSkips` — all untouched.

---

## [v1.0.0-alpha.13] - 2026-05-19

### 🇰🇷 한국어

알파.10/11/12 3버전 연속 후순위로 밀린 backlog 항목 처리 — `skipBuiltinSkips` escape hatch. 3개 빌트인 룰(`no-console-log`/`no-empty-catch`/`no-magic-number`)이 내부에서 `SKIP_FILE_RE`로 자동 스킵하던 파일(`scripts/`, `native-bridge.js`, `__tests__/` 등)을 사용자가 켜고 싶을 때 `aicq.config.yaml`에 `skipBuiltinSkips: true` 한 줄로 무력화. 룰 ON/OFF는 무관 — 빌트인 가드만 토글. **기본값 `false`라 알파.10~12 동작과 동일, dogfood 카운트 회귀 0 보장.** SKIP_FILE_RE 정규식 자체와 알파.12의 skipPatterns 메타 노출은 전혀 미접촉.

#### 게시된 패키지 (5)
- `@aicqtools/core` 1.0.0-alpha.13
- `@aicqtools/rule-sdk` 1.0.0-alpha.13
- `@aicqtools/guardrail` 1.0.0-alpha.13
- `@aicqtools/provenance` 1.0.0-alpha.13
- `@aicqtools/cli` 1.0.0-alpha.13

#### 추가
- **`skipBuiltinSkips` config 필드** (`@aicqtools/core`). `aicq.config.yaml`의 최상위 boolean (default `false`). `respectGitignore` 옆 위치. `true`로 두면 3개 빌트인 룰의 `SKIP_FILE_RE` 가드가 비활성화되어 자동 스킵되던 파일에서도 룰이 fire. 사용자가 빌트인 스킵이 과도하다고 느낄 때 사용. 알파.12에서 `aicq rules suggest`가 노출하는 skipPatterns 메타와 짝을 이루는 escape hatch.
- **`RuleContext.skipBuiltinSkips` 옵셔널 필드** (`@aicqtools/rule-sdk`). 룰 본체가 `ctx.skipBuiltinSkips`로 읽어 가드 분기. 옵셔널이라 기존 외부 사용자 rule은 type 변경 없이 그대로 컴파일.
- **3개 빌트인 룰 가드 조건문 확장**: `if (SKIP_FILE_RE.test(ctx.filePath)) return;` → `if (!ctx.skipBuiltinSkips && SKIP_FILE_RE.test(ctx.filePath)) return;`. `no-magic-number`는 `isInSkippedFile` 헬퍼 호출부에서 AND (헬퍼 시그니처 미변경).
- **runner 통과**: `RunProjectOptions` / `RunFileOptions` / `RunContext`에 옵셔널 필드 추가, CLI가 `config.skipBuiltinSkips`를 spread로 전달. 캐시 ruleset hash에 `skipBuiltinSkips` 키 합류 → 사용자가 옵션을 토글하면 캐시 자동 무효화.
- **CLI flag `--skip-builtin-skips` / `--no-skip-builtin-skips`**. 알파.9 `--gitignore`/`--no-gitignore` 패턴 그대로. 우선순위: 명시적 CLI flag > config boolean > default `false`. 한 번만 끄거나 켜고 싶을 때 config 수정 없이 사용 가능.
- **README `aicq.config.yaml` 핵심 옵션 섹션** (한·영 동시). `exclude` / `overrides` / `skipBuiltinSkips` 세 항목의 사용 예제 + 알파.11 negation silent no-op 함정 안내. 알파.11 acceptance 잔존 backlog 항목(README에 overrides/exclude 사용 예제 부재) 정리.
- **신규 테스트 10건**: guardrail 6건 (`skip-builtin-skips.test.ts` — 항목 A 3 back-compat + 항목 B 3 escape hatch on) + cli 4건 (`skip-builtin-skips-cli.test.ts` — config/CLI 우선순위 매트릭스).

#### 검증
- `pnpm -w build` / `typecheck` / `test` Windows 11에서 모두 green.
- Guardrail 테스트: 알파.12 base + 신규 6건. CLI 테스트: 알파.12 base + 신규 4건. 회귀 0.
- 알파.12 메타-실코드 동일성 가드(`rules-default-skip-patterns-meta.test.ts`) 그대로 통과 — SKIP_FILE_RE 패턴 자체 미변경.
- 실 프로젝트 도그푸드 예상(TalkUp 알파.12 baseline frontend 742 / backend 2,865 / admin 179, `skipBuiltinSkips` 미설정) — 기본값 `false`라 모든 카운트 동일.
- 알파.9 `respectGitignore` / 알파.10 `overrides.anchoring: 'auto'` / 알파.11 negation 경고 / 알파.12 paste-ready 가드 — 본 PR에서 한 줄도 미접촉.

---

### 🇬🇧 English

Cleanup of a backlog item that lingered three releases (alpha.10/11/12) — the `skipBuiltinSkips` escape hatch. Three built-in rules (`no-console-log` / `no-empty-catch` / `no-magic-number`) carry an internal `SKIP_FILE_RE` guard that auto-skips conventional paths (`scripts/`, `native-bridge.js`, `__tests__/`, …). Users who find that auto-skip too aggressive can now flip a single line — `skipBuiltinSkips: true` in `aicq.config.yaml` — to bypass the guard while leaving the rule itself enabled. **Default `false` preserves alpha.10~12 behavior; dogfood counts stay at 0 delta.** The `SKIP_FILE_RE` patterns themselves and the alpha.12 skipPatterns meta surface are both untouched.

#### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.13
- `@aicqtools/rule-sdk` 1.0.0-alpha.13
- `@aicqtools/guardrail` 1.0.0-alpha.13
- `@aicqtools/provenance` 1.0.0-alpha.13
- `@aicqtools/cli` 1.0.0-alpha.13

#### Added
- **`skipBuiltinSkips` config field** (`@aicqtools/core`). Top-level boolean (default `false`) on `aicq.config.yaml`, placed next to `respectGitignore`. When `true`, the three built-in rules' `SKIP_FILE_RE` guards are bypassed and the rules fire on the conventionally-skipped paths. Pairs with the alpha.12 `skipPatterns` meta that `aicq rules suggest` already surfaces — users can see which paths are auto-skipped, then opt out as a single line.
- **`RuleContext.skipBuiltinSkips` optional field** (`@aicqtools/rule-sdk`). Rule bodies read `ctx.skipBuiltinSkips` to fork the guard. Optional, so existing external rules compile unchanged.
- **Three built-in rule guards extended**: `if (SKIP_FILE_RE.test(ctx.filePath)) return;` → `if (!ctx.skipBuiltinSkips && SKIP_FILE_RE.test(ctx.filePath)) return;`. `no-magic-number` ANDs the flag at the `isInSkippedFile` call site (helper signature stays put).
- **Runner threading**: `RunProjectOptions` / `RunFileOptions` / `RunContext` gain optional fields; the CLI spreads `config.skipBuiltinSkips` into `runProject()`. The ruleset hash that drives cache invalidation now mixes in `skipBuiltinSkips=...`, so flipping the flag invalidates stale cache entries automatically.
- **CLI flags `--skip-builtin-skips` / `--no-skip-builtin-skips`**, following the alpha.9 `--gitignore` / `--no-gitignore` pattern. Precedence: explicit CLI flag > config boolean > default `false`. Lets a single run override config without editing `aicq.config.yaml`.
- **README `aicq.config.yaml` essentials section** (ko + en in lockstep). Walkthroughs for `exclude`, `overrides`, and `skipBuiltinSkips`, plus a callout on the alpha.11 negation silent no-op trap. Clears the alpha.11 acceptance backlog item that flagged missing user-facing overrides/exclude examples in the README.
- **Ten new tests**: guardrail ×6 (`skip-builtin-skips.test.ts` — item A ×3 back-compat + item B ×3 escape hatch on) + cli ×4 (`skip-builtin-skips-cli.test.ts` — config/CLI precedence matrix).

#### Verification
- `pnpm -w build` / `typecheck` / `test` all green on Windows 11.
- Guardrail tests: alpha.12 baseline + 6 new. CLI tests: alpha.12 baseline + 4 new. 0 regressions.
- Alpha.12 meta-vs-code equality guard (`rules-default-skip-patterns-meta.test.ts`) keeps passing — `SKIP_FILE_RE` patterns themselves are unchanged.
- Real-project dogfood expected (TalkUp alpha.12 baseline frontend 742 / backend 2,865 / admin 179 with `skipBuiltinSkips` unset): all counts unchanged because the default is `false`.
- Alpha.9 `respectGitignore` / alpha.10 `overrides.anchoring: 'auto'` / alpha.11 negation warning / alpha.12 paste-ready guard — all untouched.

---

## [v1.0.0-alpha.12] - 2026-05-18

### 🇰🇷 한국어

알파.11 위에 얹은 2개 항목 묶음 — **B축(CI 회귀 fixture)** 강화 위주. TalkUp 알파.11 acceptance verification(2026-05-18)에서 도출된 알파.12 후보 5건 중 사용자가 후보 4(1순위)와 후보 1(동봉)을 선정. 후보 4 = `formatSuggestYaml` 출력을 그대로 `aicq.config.yaml`에 복붙해 `aicq check`가 통과하는 paste-ready 계약을 영구 가드로 승격(알파.7부터 수동 dogfood로만 확인되던 항목). 후보 1 = `aicq rules suggest`가 `no-console-log`/`no-empty-catch`/`no-magic-number` 3개 룰의 SKIP_FILE_RE를 사용자에게 표시(알파.10 acceptance부터 2버전 연속 미반영 잔존 항목 정리). **룰 런타임 동작 변경 0, schema 변경 0, SDK는 선택적 필드 추가만이라 backward-compat 영향 0.**

#### 게시된 패키지 (5)
- `@aicqtools/core` 1.0.0-alpha.12
- `@aicqtools/rule-sdk` 1.0.0-alpha.12
- `@aicqtools/guardrail` 1.0.0-alpha.12
- `@aicqtools/provenance` 1.0.0-alpha.12
- `@aicqtools/cli` 1.0.0-alpha.12

#### 추가
- **`RuleMeta.skipPatterns` 선택적 필드** (`@aicqtools/rule-sdk`). 룰 본체의 `SKIP_FILE_RE` 정규식을 메타로 미러링하는 선언적 필드 — 외부 도구(예: `aicq rules suggest`)가 사용자에게 노출 가능. 런타임 가드는 그대로(라인 1개 추가); 메타-실코드 동일성은 신규 단위 테스트가 영구 보장. jsdoc로 기존 `pathExclude`(글롭, runner-level)와의 의미 차이 명시.
- **3개 빌트인 룰이 `skipPatterns` 메타 선언**: `no-console-log`, `no-empty-catch`, `no-magic-number`. 각 룰에서 `SKIP_FILE_RE`를 named export로 전환해 단위 테스트가 동일성을 검증.
- **`aicq rules suggest`에 자동 스킵 경로 표시**. text 출력은 sample location 다음에 `↳ auto-skipped paths: <pattern>` 한 줄 추가, yaml snippet은 룰 줄의 `# ...` 코멘트에 `auto-skips: <pattern>` append. 신규 i18n 키 `cli.rules.suggest.skipPatternsHint` (en/ko).
- **`formatSuggestYaml` paste-ready round-trip 회귀 가드**. 임시 디렉토리 `mkdtempSync` + `loadConfig` 경유 full round-trip + 알파.12 auto-skips 코멘트가 `parseYaml` 깨지 않음 + 빈 결과 fallback(`# No suggestions.`) 3 시나리오를 영구 가드로 승격.

#### 검증
- `pnpm -w build` / `typecheck` / `test` Windows 11에서 모두 green.
- Guardrail 테스트: 알파.11 기존 + 신규 9건(`rules-default-skip-patterns-meta` 3 + suggest 출력 변환 3 + yaml round-trip 3). 회귀 0.
- 실 프로젝트 도그푸드 예상(TalkUp 모노레포, 알파.11 baseline frontend 741 / backend 2,857 / frontend_admin 179) — 룰 로직 미변경이라 모듈 합계 동일. 알파.10/11 보존 항목(`camelcase-migration-column` 2, `no-direct-openai` 0, `parse-failed` 0/0/0, `controller-needs-async-wrapper` 18, negation stderr 경고) 그대로.
- 알파.10 `overrides.anchoring: 'auto'` 및 알파.11 negation 경고 동작 미접촉.

---

### 🇬🇧 English

A two-item bundle on top of alpha.11, focused on **axis B (CI regression fixture)** hardening. The TalkUp alpha.11 acceptance verification (2026-05-18) surfaced five candidates for alpha.12; the user picked candidate 4 (priority 1) and candidate 1 (companion). Candidate 4 = locks in the paste-ready contract that `formatSuggestYaml` output can be pasted verbatim into `aicq.config.yaml` and survive `aicq check` (previously only verified by manual dogfood since alpha.7). Candidate 1 = `aicq rules suggest` now surfaces the `SKIP_FILE_RE` regex from the three built-in rules that carry one (`no-console-log`, `no-empty-catch`, `no-magic-number`) — clearing a backlog item that lingered two releases past its alpha.10 acceptance entry. **No rule logic change, no schema change, SDK only adds an optional field — backward-compat impact 0.**

#### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.12
- `@aicqtools/rule-sdk` 1.0.0-alpha.12
- `@aicqtools/guardrail` 1.0.0-alpha.12
- `@aicqtools/provenance` 1.0.0-alpha.12
- `@aicqtools/cli` 1.0.0-alpha.12

#### Added
- **`RuleMeta.skipPatterns` optional field** (`@aicqtools/rule-sdk`). Declarative mirror of a rule body's internal `SKIP_FILE_RE` regex — external tooling (e.g. `aicq rules suggest`) can surface it to users. The runtime guard stays put (one extra line); the meta-vs-code equality is locked in by a new unit test. JSDoc spells out the semantic difference vs. the pre-existing `pathExclude` (globs, runner-level): `skipPatterns` is metadata-only, the runner does not read it for filtering.
- **Three built-in rules now declare `skipPatterns` meta**: `no-console-log`, `no-empty-catch`, `no-magic-number`. Each rule promotes its `SKIP_FILE_RE` to a named export so the unit test can compare the same RegExp instance.
- **`aicq rules suggest` surfaces auto-skipped paths**. Text output adds an `↳ auto-skipped paths: <pattern>` line after each rule's sample locations; the YAML snippet appends `auto-skips: <pattern>` inside the existing `# ...` comment on the rule line. New i18n key `cli.rules.suggest.skipPatternsHint` (en/ko).
- **`formatSuggestYaml` paste-ready round-trip regression guard**. Three scenarios locked in: full round-trip via `mkdtempSync` + `loadConfig`, alpha.12 auto-skips comment survives `parseYaml`, and the empty-report fallback (`# No suggestions.`) parses cleanly.

#### Verification
- `pnpm -w build` / `typecheck` / `test` all green on Windows 11.
- Guardrail tests: alpha.11 baseline + 9 new (`rules-default-skip-patterns-meta` ×3, suggest output ×3, yaml round-trip ×3). 0 regressions.
- Real-project dogfood expected (TalkUp monorepo, alpha.11 baseline frontend 741 / backend 2,857 / frontend_admin 179): module totals unchanged because rule logic is untouched. The alpha.10/11 preservation set (`camelcase-migration-column` 2, `no-direct-openai` 0, `parse-failed` 0/0/0, `controller-needs-async-wrapper` 18, negation stderr warning) stays intact.
- Alpha.10 `overrides.anchoring: 'auto'` and alpha.11 negation warning are both untouched.

---

## [v1.0.0-alpha.11] - 2026-05-14

### 🇰🇷 한국어

알파.10 위 DX hotfix. 토크업 알파.10 acceptance verification에서 PASS-with-caveat 1건 발견 — `overrides.paths`의 negation 패턴(`!vendor/**`, `!src/app.ts`)이 `micromatch.isMatch` array OR 시맨틱으로 silent no-op됨 (negation이 형제 positive glob을 빼주지 못함). 알파.10이 CHANGELOG·jsdoc에 부기했지만 README 안 읽고 ESLint식 config 작성하는 사용자는 함정에 빠짐. 알파.11은 명시적 entry별 stderr 경고로 최상위 `exclude:` 필드를 안내. 같은 릴리스에서 알파.10의 다중 entry 매치 없음 경고 회귀 가드 테스트도 확정(dogfood는 1 entry만 검증). 룰 로직 변경 없음, 스키마 변경 없음.

#### 게시된 패키지 (5)
- `@aicqtools/core` 1.0.0-alpha.11
- `@aicqtools/rule-sdk` 1.0.0-alpha.11
- `@aicqtools/guardrail` 1.0.0-alpha.11
- `@aicqtools/provenance` 1.0.0-alpha.11
- `@aicqtools/cli` 1.0.0-alpha.11

#### 추가
- **`overrides.paths` 안의 negation 패턴에 대한 entry별 stderr 경고.** `overrides[i].paths`에 `!`로 시작하는 글롭이 있으면 `aicq check`가 해당 entry당 한 줄씩 stderr emit — 문제의 negation 글롭 명시, `micromatch.isMatch` array 시맨틱으로 무시됨 안내, 최상위 `exclude:` 필드를 실제 opt-out 경로로 안내. 파일 수와 무관하게 entry당 1회만 출력. 신규 i18n 키 `cli.check.overridePathsNegationUnsupported` (en/ko).
- **`@aicqtools/guardrail` 신규 export** — `collectNegationPaths(overrides)` + `NegationOverridePath` 타입. `overrides[i].paths`에서 `!`로 시작하는 entry를 스캔하는 순수 헬퍼. CLI가 알파.8의 `collectUnknownOverrideIds` 옆에서 한 번 호출. 사용자 config를 사전 검증하는 외부 도구는 그대로 재사용 가능.
- **신규 테스트**: `collectNegationPaths` 5건(빈 목록·negation 없음·단일 negation·다중 entry × 다중 negation·`!**/...` 이미 anchored 형식), CLI emit 2건(en + ko), 다중 entry 무매치 회귀 가드 2건(2 무매치 entry → stderr 2줄, 1 매치 + 1 무매치 → 정확히 1줄).

#### 검증
- `pnpm -w build` / `typecheck` / `test` Windows 11에서 모두 green.
- Guardrail 테스트 — 기존 238 + 신규 5(`collectNegationPaths`). CLI 테스트 — 기존 21 + 신규 4(`overrides-cli.test.ts`). 총 268 통과, 알파.10 대비 회귀 0.
- 실 프로젝트 도그푸드 예상(토크업 모노레포, 알파.10 baseline frontend 741 / backend 2,857 / frontend_admin 179) — 룰 로직 미변경이라 모듈 합계 동일. stderr에 negation 경고 줄만 추가(사용자 config에 negation 있을 때). 알파.10 보존 항목(`camelcase-migration-column` 2, `no-direct-openai` 0, `parse-failed` 0/0/0, `controller-needs-async-wrapper` 18) 그대로.

---

### 🇬🇧 English

DX hotfix on top of alpha.10. The TalkUp alpha.10 acceptance verification surfaced one PASS-with-caveat — `overrides.paths` negation patterns (`!vendor/**`, `!src/app.ts`) silently no-op because `micromatch.isMatch` over an array uses any-match (OR) semantics, so a negation never subtracts from a sibling positive glob. Alpha.10 documented the caveat in CHANGELOG/jsdoc, but users who write ESLint-style configs without reading the docs would still get bitten. Alpha.11 emits an explicit per-entry stderr warning pointing at the top-level `exclude:` field as the real opt-out path. Same release also locks in a regression test for the alpha.10 multi-entry unmatched-paths warning (the dogfood only exercised one). No rule logic change, no schema change.

#### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.11
- `@aicqtools/rule-sdk` 1.0.0-alpha.11
- `@aicqtools/guardrail` 1.0.0-alpha.11
- `@aicqtools/provenance` 1.0.0-alpha.11
- `@aicqtools/cli` 1.0.0-alpha.11

#### Added
- **Per-entry stderr warning for negation patterns inside `overrides.paths`.** When `overrides[i].paths` contains a `!`-prefixed glob, `aicq check` writes one stderr line per offending entry that names the offending negation globs, explains that `micromatch.isMatch`'s array semantics drop them, and points users at the top-level `exclude:` field as the actual way to remove paths from the scan. The warning fires once per entry per run regardless of file count (no fan-out across the file loop). New i18n key `cli.check.overridePathsNegationUnsupported` (en/ko).
- **New `@aicqtools/guardrail` export**: `collectNegationPaths(overrides)` + `NegationOverridePath` type. Pure helper that scans `overrides[i].paths` for `!`-prefixed entries — the CLI calls it once per run alongside the alpha.8 `collectUnknownOverrideIds`. External tooling that pre-validates user configs can reuse it.
- **New test cases**: 5 `collectNegationPaths` cases (empty list, no negation, single negation, multi-entry × multi-negation, `!**/...` already-anchored form), 2 CLI emit cases (en + ko), 2 multi-entry unmatched-paths regression cases (locks in the alpha.10 multi-entry behavior — two unmatched entries → two stderr lines; one matched + one not → exactly one line).

#### Verification
- `pnpm -w build` / `typecheck` / `test` all green on Windows 11.
- Guardrail tests: previous 238 + 5 new (`collectNegationPaths`). CLI tests: previous 21 + 4 new (`overrides-cli.test.ts`). Total 268, 0 regressions vs alpha.10.
- Real-project dogfood expected (TalkUp monorepo, alpha.10 baseline frontend 741 / backend 2,857 / frontend_admin 179): all module totals unchanged because rule logic is untouched — stderr only adds new lines when a user has a negation pattern in `aicq.config.yaml`. The alpha.10 preservation set (`camelcase-migration-column` 2, `no-direct-openai` 0, `parse-failed` 0/0/0, `controller-needs-async-wrapper` 18) stays intact.

---

## [v1.0.0-alpha.10] - 2026-05-14

DX-focused sequenced release on top of alpha.9. One footgun closes: `overrides.paths` globs are now ESLint-style auto-anchored, so `paths: ['scripts/**']` finally means what users expect ("any `scripts/` in the project"). A complementary stderr warning surfaces override entries whose globs matched zero files — typos and dead config no longer silently no-op. No new config knobs, no schema breaks beyond the changed glob semantics. (Korean: 알파.9 위 DX 시퀀스 릴리스. 한 가지 함정 해소 — `overrides.paths` 글롭이 ESLint식으로 자동 anchoring되어 `paths: ['scripts/**']`이 드디어 사용자가 기대한 대로 "프로젝트 어디서든 scripts/"를 의미함. 짝으로 어떤 파일에도 매치되지 않은 override entry는 stderr 경고가 출력 — 오타·dead config는 더 이상 silent no-op되지 않음. 신규 config 손잡이 없음, 글롭 의미 변경 외 스키마 BREAKING 없음.)

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.10
- `@aicqtools/rule-sdk` 1.0.0-alpha.10
- `@aicqtools/guardrail` 1.0.0-alpha.10
- `@aicqtools/provenance` 1.0.0-alpha.10
- `@aicqtools/cli` 1.0.0-alpha.10

### Changed (BREAKING — call it out in your release notes)
- **`overrides.paths` globs are now auto-anchored.** A leading `**/` is prepended unless one is already present, so `scripts/**` and `**/scripts/**` behave identically. Background: `fast-glob` returns absolute file paths, so under alpha.8/9 a bare `scripts/**` silently never matched — the alpha.9 acceptance verification flagged this as the single PASS-with-DX-caveat. To opt out and anchor to a specific prefix, lead the glob with `/` (Unix absolute), `<letter>:/` (Windows drive), or write `**` yourself. Brace expansion at the start works: `{src,public}/scripts/**` becomes `**/{src,public}/scripts/**`. Existing configs that already wrote `**/scripts/**` (including the TalkUp adopter's `aicq.config.yaml` and every alpha.8 test fixture) are idempotent — zero behavior change. Projects that wrote shorter forms like `scripts/**` will see those entries actually take effect for the first time; for the overwhelmingly common ESLint-style intent, this is the intended fix. Note on negation: a `!` prefix is preserved through normalization (`!vendor/**` → `!**/vendor/**`), but `paths` arrays use `micromatch.isMatch`'s any-match semantics — a negation entry does not subtract from a sibling positive glob. To remove paths from the scan, use the top-level `exclude:` field instead. (Korean: `overrides.paths` 글롭이 자동으로 anchoring됨. 이미 있지 않은 한 leading `**/`이 prepend되어 `scripts/**`와 `**/scripts/**`가 동일하게 동작. 배경 — `fast-glob`이 absolute 파일 경로를 반환하기 때문에 알파.8/9에서 bare `scripts/**`은 silent하게 매치되지 않았음. 알파.9 acceptance 보고서가 이 점을 유일한 PASS-with-DX-caveat으로 지목. 특정 prefix로 anchor하려면 `/`(Unix absolute), `<letter>:/`(Windows drive)를 앞에 두거나 `**`을 직접 작성. 시작 부분의 brace expansion도 작동 — `{src,public}/scripts/**`은 `**/{src,public}/scripts/**`. 이미 `**/scripts/**`로 작성된 config(토크업 adopter의 `aicq.config.yaml` 및 모든 알파.8 테스트 fixture 포함)는 idempotent — 동작 변경 0. `scripts/**` 같은 짧은 형태로 작성한 프로젝트는 해당 entry가 처음으로 실제 효과를 봄. ESLint식 의도가 압도적으로 일반적이므로 의도된 수정. 부기 — negation `!` prefix는 정규화에서 보존(`!vendor/**` → `!**/vendor/**`)되지만, `paths` 배열은 `micromatch.isMatch`의 any-match 시맨틱을 따르므로 같은 entry 안의 negation entry는 형제 positive glob을 빼주지 않음. 경로를 스캔에서 제거하려면 최상위 `exclude:` 필드를 사용.)

### Added
- **Per-entry "matched no files" stderr warning for `overrides`.** After the scan, any `overrides[i]` whose globs matched zero scanned files emits a single stderr line including the entry's index and the `paths` array — surfaced the same way alpha.8's unknown-rule-id warning is. Auto-anchoring closes the silent-no-op case for typical configs; this warning catches genuine typos (`srcipts/**`) and dead entries pointing at directories that no longer exist. The new field `CheckResult.overrideMatchCounts: readonly number[] | undefined` carries the per-entry counts (omitted entirely when no overrides are configured, preserving the alpha.8 fast path). New i18n key `cli.check.overridePathsNoMatch` (en/ko). (Korean: `overrides`의 entry별 "매치 없음" stderr 경고. 스캔 종료 후 `overrides[i]`의 글롭이 어떤 스캔 파일과도 매치되지 않으면 entry 인덱스와 `paths` 배열을 담은 한 줄 stderr가 emit됨 — 알파.8의 unknown-rule-id 경고와 동일한 방식. auto-anchoring이 보통 config의 silent no-op은 막아주고, 이 경고는 진짜 오타(`srcipts/**`)나 더 이상 존재하지 않는 디렉토리를 가리키는 dead entry를 잡음. 신규 필드 `CheckResult.overrideMatchCounts: readonly number[] | undefined`가 entry별 카운트를 운반 — overrides가 없으면 필드 자체 누락(알파.8 fast path 보존). 신규 i18n 키 `cli.check.overridePathsNoMatch` (en/ko).)
- **New `@aicqtools/guardrail` export**: `normalizeOverridePath(glob: string): string`. Pure helper that implements the auto-anchoring rules above. External tooling that pre-processes user configs can call it to surface the normalized form. (Korean: `@aicqtools/guardrail` 신규 export — `normalizeOverridePath(glob: string): string`. 위 auto-anchoring 규칙을 구현하는 순수 헬퍼. 사용자 config를 전처리하는 외부 도구는 호출해서 정규화된 형태를 노출할 수 있음.)
- **New test cases**: 7 cases in `normalizeOverridePath` (bare globs, `**` idempotence, Unix absolute, Windows drive, negation, brace expansion, empty input), 5 cases in `applyOverridesForFile — auto-anchored matching` (silent no-op fix, short vs long form parity, negation honored, absolute-path anchoring, per-entry match-count accumulator), 3 `runProject — overrideMatchCounts` cases (dead entry → 0, live entry counts across files, fast-path omission), 3 CLI cases in `runCheck — overrides unmatched-paths stderr` (en/ko emit, silent when every entry matched). (Korean: 신규 테스트 — `normalizeOverridePath` 7건, `applyOverridesForFile` auto-anchoring 5건, `runProject overrideMatchCounts` 3건, CLI 무매치 stderr 3건.)

### Changed
- `CheckResult` interface gains an optional `overrideMatchCounts?: readonly number[]` field. Existing callers that pattern-match `CheckResult` continue to compile — the field is optional and SARIF/JSON reporters ignore it. (Korean: `CheckResult` 인터페이스에 선택적 `overrideMatchCounts?: readonly number[]` 필드 추가. 기존 `CheckResult` 호출자는 변경 없이 컴파일됨 — optional이고 SARIF/JSON reporter는 무시함.)
- `applyOverridesForFile` accepts an optional 4th argument `matchCounts?: number[]` that is mutated in place per matched override entry. Callers that omit it see no behavior change. The runner allocates the array only when `overrides.length > 0`, so the fast path stays allocation-free. (Korean: `applyOverridesForFile`가 4번째 인자 `matchCounts?: number[]`를 선택적으로 받음 — 매치된 override entry별로 in-place mutate. 인자를 생략하면 동작 변경 0. runner는 `overrides.length > 0`일 때만 배열을 할당하므로 fast path는 allocation-free 유지.)
- Removed three TalkUp-specific references that lingered in tool metadata after the alpha.3~9 dogfood cycle: the `no-id-overwrite` JSDoc, the `rules-default/index.ts` Phase 0 comment, and a test fixture string. The two `talkup-rules*.test.ts` test files were renamed to `stack-rules*.test.ts` to match their generic Next.js + Sequelize + Capacitor fixture content. No public API, rule logic, or rule message changed — every prior `talkup-rules*.test.ts` case still runs under the new filenames. (Korean: 알파.3~9 도그푸드 사이클 동안 도구 metadata에 남아 있던 토크업 특정 참조 3건 제거 — `no-id-overwrite` JSDoc, `rules-default/index.ts`의 Phase 0 주석, 테스트 fixture 문자열. `talkup-rules*.test.ts` 두 파일은 fixture가 generic Next.js + Sequelize + Capacitor 패턴을 검증하는 내용에 맞춰 `stack-rules*.test.ts`로 rename. public API·룰 로직·룰 메시지 변경 없음 — 기존 `talkup-rules*.test.ts`의 모든 케이스는 새 파일명에서 그대로 실행.)

### Fixed
- **`no-magic-number`, `no-empty-catch`, `no-console-log` skip patterns expanded for Capacitor/PWA bridge files and build-script directories.** Three rules now skip standard convention paths so users no longer need to write `overrides:` entries for noise that's universally inappropriate. `no-magic-number` and `no-empty-catch` skip `**/native-bridge.{js,ts,jsx,tsx}` (Capacitor convention) and `**/service-worker.{js,ts,jsx,tsx}` (PWA convention) — bridge files swallow exceptions and embed protocol constants on purpose. `no-console-log` and `no-magic-number` skip `**/(scripts|tools|bin)/**` (build/utility script directories — same shape as alpha.8's `seeders/`+`migrations/` skip for `no-magic-number`). The skip is intentionally narrow: bare `bridge.ts`, `sw.js`, or top-level `scripts-utils.ts` (no `/scripts/` segment) keep firing, and other rules (`camelcase-migration-column`, `controller-needs-async-wrapper`, `no-direct-openai`, `route-needs-rate-limit`, etc.) continue to fire on the same files — the skip is scoped to the three rules above. Resolves the alpha.9 acceptance §"다음 alpha 피드백" items 2–3 (TalkUp dogfood expected delta: native-bridge.js 6 hits → 0, backend `scripts/` ~262 hits → ~0). (Korean: Capacitor/PWA bridge 파일과 빌드 스크립트 디렉토리에 대한 `no-magic-number`/`no-empty-catch`/`no-console-log` skip 패턴 확장. 세 룰이 표준 컨벤션 경로를 skip하므로 사용자가 노이즈에 대해 `overrides:` 작성할 필요가 없어짐. `no-magic-number`와 `no-empty-catch`는 `**/native-bridge.{js,ts,jsx,tsx}`(Capacitor)와 `**/service-worker.{js,ts,jsx,tsx}`(PWA) skip — bridge 파일은 의도적으로 예외를 삼키고 프로토콜 상수를 inline embed. `no-console-log`와 `no-magic-number`는 `**/(scripts|tools|bin)/**` skip(빌드/유틸 스크립트 디렉토리 — 알파.8의 `seeders/`+`migrations/` `no-magic-number` skip과 동일 형태). skip 범위는 의도적으로 좁음 — bare `bridge.ts`, `sw.js`, 또는 top-level `scripts-utils.ts`(`/scripts/` segment 없음)는 계속 발화하고, 다른 룰(`camelcase-migration-column`, `controller-needs-async-wrapper`, `no-direct-openai`, `route-needs-rate-limit` 등)은 같은 파일에서 계속 발화 — skip은 위 세 룰에 한정. 알파.9 acceptance §"다음 alpha 피드백" 항목 2~3 해소(토크업 dogfood 예상 delta: native-bridge.js 6 hits → 0, backend `scripts/` ~262 hits → ~0).)

### Verification
- `pnpm -w build` / `typecheck` / `test` / `lint` all green on Windows 11.
- Guardrail tests: previous 313 + 18 new (`normalizeOverridePath` 7, `applyOverridesForFile` auto-anchored matching 5, `runProject overrideMatchCounts` 3, plus existing 13 alpha.8 cases reaffirmed). CLI tests: previous + 3 new in `overrides-cli.test.ts`. 0 regressions vs alpha.9. (Korean: Guardrail 테스트 — 기존 313 + 신규 18건. CLI 테스트 — 기존 + 신규 3건. 알파.9 대비 회귀 0건.)
- Real-project dogfood expected (TalkUp monorepo, existing `aicq.config.yaml` with `**/scripts/**` and `**/public/native-bridge.js`): all four module totals unchanged (frontend 756 / backend 3,052 / frontend_admin 179, with `camelcase-migration-column` 2/2, `no-direct-openai` 0/0, `parse-failed` 0). Shortening any override entry's glob from `**/scripts/**` to `scripts/**` should produce the same diagnostic counts — first-class evidence the silent-no-op is closed. (Korean: 실 프로젝트 도그푸드 예상(TalkUp 모노레포, 기존 `aicq.config.yaml`에 `**/scripts/**`와 `**/public/native-bridge.js`) — 모듈 4종 totals 동일(frontend 756 / backend 3,052 / frontend_admin 179, `camelcase-migration-column` 2/2, `no-direct-openai` 0/0, `parse-failed` 0). override entry의 글롭을 `**/scripts/**`에서 `scripts/**`로 단축해도 동일 diagnostic 카운트 — silent no-op이 해소됐다는 직접 증거.)

---

## [v1.0.0-alpha.9] - 2026-05-13

Sequenced release on top of alpha.8 that flips two ergonomic defaults so the friendly behavior is the out-of-the-box one. BREAKING surface is contained to two clearly-named knobs: `respectGitignore` becomes `auto`, and `DEFAULT_EXCLUDE` gains three narrow build-output paths. Both can be opted out per-project. (Korean: 알파.8 위에 두 가지 친화성 디폴트를 뒤집는 시퀀스 릴리스. BREAKING 표면은 명명된 두 개의 손잡이로 한정 — `respectGitignore`이 `auto`가 되고, `DEFAULT_EXCLUDE`에 좁은 빌드 산출물 경로 3개 추가. 둘 다 프로젝트별로 opt-out 가능.)

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.9
- `@aicqtools/rule-sdk` 1.0.0-alpha.9
- `@aicqtools/guardrail` 1.0.0-alpha.9
- `@aicqtools/provenance` 1.0.0-alpha.9
- `@aicqtools/cli` 1.0.0-alpha.9

### Changed (BREAKING — call it out in your release notes)
- **`respectGitignore` default flips from `false` to `'auto'`.** The schema now accepts `boolean | 'auto'` (zod union) and the default is `'auto'`. With `'auto'`, the file walker reads the repo-root `.gitignore` when one is present and ignores the field when it isn't, so projects with a `.gitignore` get the friendly behavior immediately and projects without one keep deterministic excludes. Explicit `true`/`false` retain the legacy meanings. New CLI flags `--gitignore` / `--no-gitignore` override config for a single run (precedence: CLI > config boolean > config `'auto'` → existence check). The large-scan stderr advisory only fires when the resolved value is `false`, so a project with a `.gitignore` no longer sees the hint unnecessarily. (Korean: `respectGitignore` 기본값이 `false` → `'auto'`로 뒤집힘. 스키마는 `boolean | 'auto'` 유니온이 되고 기본값은 `'auto'`. `'auto'`에서는 워커가 루트 `.gitignore`가 있으면 읽고 없으면 무시 — `.gitignore`가 있는 프로젝트는 즉시 친화적 동작, 없는 프로젝트는 결정적 exclude 유지. 명시적 `true`/`false`는 기존 의미 유지. 신규 CLI 플래그 `--gitignore` / `--no-gitignore`로 단일 실행 override (우선순위: CLI > config boolean > config `'auto'` → 존재 확인). 대용량 스캔 안내는 resolve된 값이 `false`일 때만 출력되므로 `.gitignore`가 있는 프로젝트는 불필요한 힌트를 받지 않음.)
- **`DEFAULT_EXCLUDE` adds three narrow `public/` build-output subdirs.** New entries: `**/public/_next/**`, `**/public/static/**`, `**/public/build/**`. These are the canonical paths frameworks copy bundles into; alpha.7 only excluded the Capacitor-native copies (`ios/App/**/public/`, `android/.../assets/public/`) so a vanilla Next.js static export landing in `public/_next/` was being scanned. **Deliberately not added**: `**/public/**` itself — hand-written assets (e.g. Capacitor's `public/native-bridge.js`) belong there and must still be scanned. Projects that disagree can shadow this via `exclude:` (full replacement) or the alpha.8 `overrides:`. (Korean: `DEFAULT_EXCLUDE`에 좁은 `public/` 빌드 산출물 서브디렉토리 3개 추가. 새 항목: `**/public/_next/**`, `**/public/static/**`, `**/public/build/**`. 프레임워크가 번들을 복사하는 표준 경로 — alpha.7는 Capacitor 네이티브 복사본(`ios/App/**/public/`, `android/.../assets/public/`)만 제외했기 때문에 일반 Next.js static export가 `public/_next/`에 떨어지면 스캔됐음. **의도적으로 추가하지 않음**: `**/public/**` 자체 — 수기 작성 자산(예: Capacitor의 `public/native-bridge.js`)이 거기 있고 반드시 스캔돼야 함. 프로젝트가 동의하지 않으면 `exclude:`(전체 교체) 또는 알파.8 `overrides:`로 가릴 수 있음.)

### Added
- **CLI flags `--gitignore` and `--no-gitignore`** on `aicq check`. Force-enable / force-disable `.gitignore` honoring for a single run, regardless of config. (Korean: `aicq check`에 `--gitignore` / `--no-gitignore` 플래그. config와 무관하게 단일 실행에서 `.gitignore` 적용 강제 활성·비활성.)

### Verification
- `pnpm -w build` / `typecheck` / `test` / `lint` all green on Windows 11.
- New tests: `config-schema.test.ts` extended with respectGitignore union cases (5), `respect-gitignore-auto.test.ts` (CLI precedence × 6 fixtures), updated `default-exclude.test.ts` (asserts `public/_next/**` / `public/static/**` / `public/build/**` membership; asserts `**/public/**` is *not* added; fixture's `public/native-bridge.js` is still scanned). 313 tests pass, 0 regressions vs alpha.8. (Korean: 신규 테스트 — `config-schema.test.ts`에 respectGitignore 유니온 5 케이스 추가, `respect-gitignore-auto.test.ts`(CLI 우선순위 × 6 fixture), 확장된 `default-exclude.test.ts`(새 항목 멤버십·`**/public/**` 비추가·fixture의 `public/native-bridge.js`는 여전히 스캔 확인). 313 테스트 통과, 알파.8 대비 회귀 0건.)

---

## [v1.0.0-alpha.8] - 2026-05-13

Structural release on top of alpha.7. One ESLint-style mechanism (`overrides`) absorbs three of the alpha.7 dogfood follow-ups in a single channel (user-defined `pathExclude`, per-directory severity, per-file rule disable), and one targeted rule heuristic (`no-magic-number` skipping seeders/migrations) removes the largest residual noise source. No default-value flips — those land in alpha.9. (Korean: 알파.7 위 구조적 릴리스. ESLint식 한 메커니즘(`overrides`)이 알파.7 도그푸드 후속 3건(사용자 정의 `pathExclude`·디렉토리별 severity·파일별 룰 비활성)을 한 채널로 흡수하고, 표적 룰 휴리스틱 1건(seeders/migrations에서 `no-magic-number` skip)이 가장 큰 잔존 노이즈를 제거. 디폴트값 flip은 없음 — 그것은 알파.9에서.)

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.8
- `@aicqtools/rule-sdk` 1.0.0-alpha.8
- `@aicqtools/guardrail` 1.0.0-alpha.8
- `@aicqtools/provenance` 1.0.0-alpha.8
- `@aicqtools/cli` 1.0.0-alpha.8

### Added
- **`modules.guardrail.overrides` — ESLint-style per-path rule resolution.** A new array under `aicq.config.yaml > modules.guardrail` where each entry is `{ paths: glob[], rules: { ruleId: 'off' | 'warn' | 'error' } }`. For each scanned file the runner walks the overrides in declaration order, merging matched entries into a per-file effective rule map (later wins, same as ESLint). `off` drops the rule for that file; `warn`/`error` overrides its emitted severity. The mechanism is intentionally a *superset* of three alpha.7 followups in one channel: user-defined `pathExclude` (use `off`), per-directory rule severity (use `warn`/`error`), and rule-specific exemption beyond what a rule's built-in `pathExclude` provides. Fast path: when no entries are configured the runner skips the resolver entirely. Empty entries are rejected at schema time (`paths` must contain ≥ 1 glob). Windows backslash paths are normalized for matching. (Korean: `aicq.config.yaml > modules.guardrail` 아래 새 배열. 각 항목은 `{ paths: glob[], rules: { ruleId: 'off' | 'warn' | 'error' } }`. 매 스캔 파일마다 runner가 선언 순으로 순회하며 매치된 항목을 파일별 effective 룰 맵에 머지(later wins, ESLint와 동일). `off`는 해당 파일에서 룰을 drop, `warn`/`error`는 emit severity를 override. 알파.7 후속 3건(사용자 정의 `pathExclude`·디렉토리별 severity·룰별 면제)을 한 채널로 흡수하는 *상위집합*. 항목이 없으면 resolver 자체를 건너뛰는 fast path. 빈 항목은 스키마에서 reject(`paths`에 ≥ 1개 glob 필수). Windows 백슬래시 경로는 매칭 시 정규화.)
- **Per-entry stderr warning for unknown rule ids inside `overrides`.** When `overrides[i].rules` references an id that doesn't exist on any loaded rule, `aicq check` writes a single stderr line with the override index, the offending id, and the matched `paths` — so a typo surfaces at the same severity (and verbosity) as the existing top-level `rules:` map check. New i18n key `cli.check.unknownRuleIdInOverride` (en/ko). (Korean: `overrides[i].rules`가 로드된 룰에 없는 id를 참조하면 `aicq check`가 override 인덱스·해당 id·매치된 `paths`를 한 줄 stderr로 출력 — 기존 최상위 `rules:` 맵 검사와 동일한 가시성. 신규 i18n 키 `cli.check.unknownRuleIdInOverride` (en/ko).)
- **`no-magic-number` skips `seeders/` and `migrations/` directories.** Added to the rule's `SKIP_FILE_RE` next to the existing `fixtures/`, `*.config.*`, `*.polyfill.*`, `polyfills/` skips. These directories hold data files where numeric literals *are* the payload (Sequelize seeder rows, Knex/Prisma migration column definitions, ORM fixtures). Other rules (notably `camelcase-migration-column`) still fire on the same files — the skip is scoped to `no-magic-number` alone. (Korean: `no-magic-number` 룰의 `SKIP_FILE_RE`에 `seeders/`와 `migrations/` 추가 — 기존 `fixtures/`·`*.config.*`·`*.polyfill.*`·`polyfills/` 옆. 데이터 파일이라 숫자 리터럴이 *페이로드 그 자체*인 디렉토리(Sequelize seeder 행, Knex/Prisma migration 컬럼 정의, ORM fixture). 다른 룰(특히 `camelcase-migration-column`)은 같은 파일에서 계속 발화 — skip은 `no-magic-number` 단독으로 한정.)
- **New `@aicqtools/core` exports**: `RuleOverride` (type), `ruleOverrideSchema` (zod). (Korean: `@aicqtools/core` 신규 export — `RuleOverride` 타입과 `ruleOverrideSchema` zod 스키마.)
- **New `@aicqtools/guardrail` exports**: `applyOverridesForFile`, `collectUnknownOverrideIds`, `UnknownOverrideId` (type). (Korean: `@aicqtools/guardrail` 신규 export — `applyOverridesForFile`, `collectUnknownOverrideIds`, `UnknownOverrideId` 타입.)
- **New test fixtures and suites**: `overrides.test.ts` (per-file resolution, fast path, last-write-wins, Windows backslash, end-to-end `runProject` integration with `off` and `error`), `overrides-cli.test.ts` (CLI wiring: config → runProject forwarding, omission when empty, unknown id stderr ko/en), seeders/migrations cases appended to `no-magic-number-skips.test.ts`. (Korean: 신규 테스트 — `overrides.test.ts`(파일별 resolution, fast path, last-write-wins, Windows 백슬래시, `runProject` end-to-end 통합), `overrides-cli.test.ts`(CLI 배선: config → runProject 전달, 빈 경우 누락, unknown id stderr ko/en), `no-magic-number-skips.test.ts`에 seeders/migrations 케이스 추가.)

### Changed
- `applyOverridesForFile` does not change the in-process `Rule` reference identity for the unmatched fast path — callers may rely on reference equality when no override matches. (Korean: 매치되는 override가 없는 fast path에서 `applyOverridesForFile`는 in-process `Rule` 참조 동일성을 유지 — 매치 없을 때 호출자는 참조 비교 가능.)
- Cache key now mixes in the overrides shape (`overrides=<JSON>`) alongside the existing ruleset signature, so a config change that adds/removes/edits an override flushes stale cache entries automatically. (Korean: 캐시 키가 기존 ruleset signature 옆에 `overrides=<JSON>`을 함께 섞음 — override 추가/삭제/수정 시 stale 캐시가 자동 무효화.)

### Verification
- `pnpm -w build` / `typecheck` / `test` / `lint` all green on Windows 11.
- Guardrail tests: previous 191 + 13 new (`overrides.test.ts`: 10, seeders/migrations skip cases: ~5 new on top of existing 9). CLI tests: previous + new `overrides-cli.test.ts` (4). 0 regressions on alpha.7 suites. (Korean: Guardrail 테스트 — 기존 191 + 신규 13건. CLI 테스트 — 기존 + 신규 4건. 알파.7 suite 회귀 0건.)
- Real-project dogfood expected (TalkUp monorepo, with new `overrides` for `public/native-bridge.js` + `scripts/**`): frontend `totalDiagnostics` ≤ 756 maintained; backend `no-magic-number` in `database/seeders/**` drops from ~706 to 0; `camelcase-migration-column` 2 → 2 (migrations still visible). (Korean: 실 프로젝트 도그푸드 예상(TalkUp 모노레포, `public/native-bridge.js` + `scripts/**`에 신규 `overrides` 사용) — frontend `totalDiagnostics` ≤ 756 유지; backend의 `database/seeders/**`에서 `no-magic-number` ~706건 → 0; `camelcase-migration-column` 2 → 2(migrations 여전히 가시).)

---

## [v1.0.0-alpha.7] - 2026-05-13

Dogfood-driven hotfix release. Five issues surfaced by the alpha.6 dogfood are fixed; every change stays generic — no project-specific paths or rule values are baked into the tool. (Korean: 도그푸드 기반 hotfix 릴리스. alpha.6 도그푸드에서 발견된 5건을 해소했고, 모든 변경은 도구를 generic하게 유지하도록 설계됨 — 특정 프로젝트 경로나 룰 값은 도구에 박혀 있지 않음.)

### Published packages (5)
- `@aicqtools/core` 1.0.0-alpha.7
- `@aicqtools/rule-sdk` 1.0.0-alpha.7
- `@aicqtools/guardrail` 1.0.0-alpha.7
- `@aicqtools/provenance` 1.0.0-alpha.7
- `@aicqtools/cli` 1.0.0-alpha.7

### Fixed
- **Default `exclude` list expanded with framework conventions.** Alpha.6's defaults (`node_modules`, `dist`, `.turbo`, `build`) missed Next.js exports (`out/`), Capacitor webDir copies (`ios/App/**/public/`, `android/app/src/main/assets/public/`), coverage reports, hosting caches (`.vercel/`, `.netlify/`, `.expo/`), Python vendoring/caches, and minified bundles — together ~95% of the violation noise in the alpha.6 dogfood. The new list adds these conventions but **deliberately does not** exclude `migrations/`, `seeders/`, `database/`, or `scripts/` because rules such as `camelcase-migration-column` must still see those files. Exported as `DEFAULT_EXCLUDE` from `@aicqtools/core` for reuse and visibility. (Korean: 기본 `exclude` 목록 확장 — alpha.6 기본값은 Next 정적 export(`out/`), Capacitor 웹 번들 복사본(`ios/App/**/public/`, `android/app/src/main/assets/public/`), coverage 리포트, 호스팅 캐시(`.vercel/`, `.netlify/`, `.expo/`), Python 벤더링/캐시, 미니파이 번들을 놓쳤음 — 합치면 alpha.6 도그푸드 노이즈의 ~95%. 새 목록은 이 컨벤션들을 추가하되 `migrations/`·`seeders/`·`database/`·`scripts/`는 **절대 제외하지 않음** — `camelcase-migration-column` 같은 룰이 그 파일을 봐야 하기 때문. `@aicqtools/core`에서 `DEFAULT_EXCLUDE`로 export.)
- **`no-direct-openai` / `no-direct-anthropic` no longer flag the designated wrapper file.** Both YAML rules now ship a generic `pathExclude` convention (`**/llm/client.*`, `**/llm/index.*`, `**/ai/**/*client*.*`) so the one legitimate SDK call-site is exempt. Combined with the new inline-suppression directives (see Added), a project can place its wrapper anywhere and silence with one comment. The alpha.5 dogfood's "1 real violation" line was this wrapper file itself — the true real-violation count is 0. (Korean: `no-direct-openai`/`no-direct-anthropic`가 지정 wrapper 파일을 더 이상 오탐하지 않음. 두 YAML 룰에 일반 컨벤션 `pathExclude` (`**/llm/client.*`, `**/llm/index.*`, `**/ai/**/*client*.*`)를 추가해 합법적 SDK 호출 지점은 면제. 신규 인라인 suppression 디렉티브(Added 참고)와 조합하면 wrapper를 어디 두든 코멘트 한 줄로 처리 가능. alpha.5 도그푸드의 "실위반 1건" 줄은 이 wrapper 파일 자신이었음 — 진짜 실위반은 0건.)
- **`no-magic-number` noise dramatically reduced.** Generic AST skips: JSX attribute values (`<View width={24} />`), enum members (`enum E { A = 7 }`), array subscripts (`arr[42]`), `for`-loop headers, and arguments to obvious numeric APIs (`parseInt(s, 16)`, `Math.max(3, 7)`, `setTimeout(f, 100)`, `.toFixed(2)`, …). File globs `*.{config,polyfill}.{ts,tsx,js,jsx}` and `**/polyfills/**` are also skipped. The allow-list expands to `0,1,-1,2,-2,10,16,24,60,100,1000,1024` (powers, time, base 16). No config required. Resolves the alpha.3 dogfood note about the 43,716-hit `no-magic-number` surge on a Next.js frontend. (Korean: `no-magic-number` 노이즈 대폭 감소. 일반 AST skip: JSX attribute 값(`<View width={24} />`), enum 멤버(`enum E { A = 7 }`), 배열 인덱스(`arr[42]`), `for` 루프 헤더, 명백한 numeric API의 인자(`parseInt(s, 16)`, `Math.max(3, 7)`, `setTimeout(f, 100)`, `.toFixed(2)` 등). 파일 글롭 `*.{config,polyfill}.{ts,tsx,js,jsx}`와 `**/polyfills/**`도 skip. allow-list를 `0,1,-1,2,-2,10,16,24,60,100,1000,1024`(2의 거듭제곱·시간·base 16 포함)로 확장. config 불필요. alpha.3 도그푸드의 "Next.js 프론트엔드에서 43,716 hits `no-magic-number` 폭증" 메모를 해소함.)
- **`config.modules.guardrail.rules` now actually takes effect.** The `{ ruleId: off|warn|error }` map was declared in the schema but never consumed by the runner — setting `no-magic-number: off` in `aicq.config.yaml` did nothing. A new `applyRuleConfig` step in `aicq check` honors the map: `off` drops the rule, `warn`/`error` overrides its emitted severity. Unknown rule ids are logged once to stderr (`cli.check.unknownRuleId`) rather than silently ignored. The map is intentionally **not** applied during `aicq rules suggest` so the recommender always considers all built-ins. (Korean: `config.modules.guardrail.rules`가 드디어 실제로 동작. `{ ruleId: off|warn|error }` 맵은 스키마에는 선언돼 있었지만 runner가 소비하지 않았음 — `aicq.config.yaml`에 `no-magic-number: off`를 적어도 효과가 없었던 상태. `aicq check`에 신규 `applyRuleConfig` 단계가 맵을 honor함: `off`는 룰을 drop, `warn`/`error`는 emit되는 severity를 override. 알 수 없는 rule id는 silent 무시가 아니라 `cli.check.unknownRuleId`로 stderr 1회 로그. `aicq rules suggest`에서는 의도적으로 **적용하지 않음** — suggester는 항상 모든 빌트인 룰을 고려해야 함.)
- **`no-process-env-leak` allow-list regex now matches `*.config.*` filenames.** The prior regex required `config` / `env` to be preceded by `/`, `\`, or start-of-path, so `next.config.ts`, `vite.config.ts`, `jest.config.ts` (the `config` is preceded by `.`) leaked. Prefix character class broadened to include `.`. (Korean: `no-process-env-leak` allow-list 정규식이 이제 `*.config.*` 파일명까지 매치. 기존 정규식은 `config`/`env` 앞에 `/`·`\`·문자열 시작이 와야 했기 때문에 `next.config.ts`/`vite.config.ts`/`jest.config.ts`(앞이 `.`)에서 누수됨. prefix 문자 클래스에 `.`를 추가해 broaden.)

### Added
- **Inline suppression directives — ESLint-style comment markers.** Three forms, applied centrally in `runFileWithSource` so they cover every rule (function rules, YAML pattern rules, and synthetic `@aicq/parse-failed`):
  - `// aicq-disable-next-line <rule-id>[, <rule-id>...]` — next line
  - `// aicq-disable-line <rule-id>...` — same line (trailing comment supported)
  - `// aicq-disable-file <rule-id>...` or `/* aicq-disable-file ... */` — whole file
  - Python uses `#`. The rule-id list may be omitted to suppress all rules for that scope. Multiple ids may be comma- or whitespace-separated. Malformed directives never throw; unknown rule ids are silently accepted (a project may rename rules).
  - (Korean: 인라인 suppression 디렉티브 — ESLint 식 코멘트 마커. 세 가지 형태가 있고, `runFileWithSource`에서 중앙 적용되므로 모든 룰(함수 룰·YAML 패턴 룰·`@aicq/parse-failed` 합성 룰까지)을 커버함. Python은 `#` 사용. 룰 id 목록은 생략 가능(전체 룰 suppress). 다중 id는 콤마 또는 공백 구분. malformed 디렉티브는 throw하지 않으며, 알 수 없는 rule id는 silent 허용(프로젝트가 룰명을 바꿨을 수 있으므로).)
- **`pathExclude` field on rule schema.** Both TS function rules (`defineRule({ pathExclude: [...] })`) and YAML pattern rules (`pathExclude:` key) accept an optional array of micromatch globs. If `ctx.filePath` matches any glob, the rule is skipped for that file. Generic alternative to converting every pattern rule to a function rule just for path filtering. (Korean: 룰 스키마에 `pathExclude` 필드 추가. TS 함수 룰(`defineRule({ pathExclude: [...] })`)과 YAML 패턴 룰(`pathExclude:` 키) 모두 micromatch 글롭 배열을 옵션으로 받음. `ctx.filePath`가 매치하면 그 파일에서 룰 skip. 패턴 룰을 단지 경로 필터링을 위해 함수 룰로 재작성할 필요 없는 generic 대안.)
- **`respectGitignore` config field.** Opt-in via `respectGitignore: true` in `aicq.config.yaml`; when on, the file walker reads the repo-root `.gitignore` and appends its entries to the effective exclude list. Default `false` for deterministic behavior across projects. Unreadable / missing `.gitignore` is silently tolerated. (Korean: `respectGitignore` config 필드 신설. `aicq.config.yaml`에 `respectGitignore: true`로 opt-in; 켜면 repo 루트의 `.gitignore`를 읽어 effective exclude 목록에 합침. 프로젝트 간 결정적 동작을 위해 기본값 `false`. 읽을 수 없는 / 누락된 `.gitignore`는 silent 무시.)
- **`aicq rules suggest` noise heuristic now affects the emitted snippet.** Previously the `NOISY_RATIO` flag only appeared in the text reporter — the YAML snippet always emitted noisy rules as active `warn`. Now info-severity rules and rules flagged as noisy (gap criterion OR `info && hits > 200`) are emitted **commented-out** with an explanatory note. Pasting the snippet as-is can never flood a project with low-signal diagnostics. The snippet is preceded by a header banner that says: "Baseline suggestion — review every line before committing. Project-specific rules belong in your `rulesDir`, not in this map." (en + ko). (Korean: `aicq rules suggest`의 노이즈 휴리스틱이 이제 emit되는 스니펫까지 영향. 이전에는 `NOISY_RATIO` 플래그가 텍스트 리포터에만 표시되고 YAML 스니펫은 노이즈 룰도 항상 active `warn`으로 emit했음. 이제 info-severity 룰과 noisy 플래그된 룰(gap 기준 OR `info && hits > 200`)은 설명 코멘트와 함께 **주석 처리된 줄**로 emit. 스니펫을 그대로 붙여넣어도 저신호 진단이 프로젝트를 휩쓸지 않음. 스니펫 상단에 헤더 배너 "베이스라인 제안 — 커밋 전 모든 줄을 검토하세요. 프로젝트 고유 룰은 `rulesDir`에, 이 맵이 아님." (en + ko)가 붙음.)
- **`aicq rules suggest --patterns` is now labeled `(experimental)`** in CLI help, and stdlib / global identifiers (`Array`, `Object`, `Map`, `Set`, `Date`, `Promise`, `RegExp`, `JSON`, `console`, `Math`, `process`, `URL`, …) are filtered from drafted patterns so `new Map()` / `JSON.parse()` / `console.log()` shapes never produce auto-drafted rules. (Korean: `aicq rules suggest --patterns`가 CLI 도움말에서 `(experimental)`로 라벨링됨. 또한 stdlib / 글로벌 식별자(`Array`/`Object`/`Map`/`Set`/`Date`/`Promise`/`RegExp`/`JSON`/`console`/`Math`/`process`/`URL` 등)는 draft 패턴에서 필터됨 — `new Map()`/`JSON.parse()`/`console.log()` 형태는 자동 draft 룰을 만들지 않음.)
- **Large-scan stderr advisory.** When `aicq check` scans more than 5000 files with no `aicq.config.yaml` and `respectGitignore` off, a one-line stderr hint suggests adding a config or enabling `respectGitignore` — most likely the user is scanning build artifacts. Never affects exit code; stderr keeps json/sarif machine output clean. (Korean: 대용량 스캔 stderr 안내. `aicq check`가 5000개 이상 파일을 스캔하는데 `aicq.config.yaml`이 없고 `respectGitignore`도 꺼져 있으면, config 작성이나 `respectGitignore` 활성화를 권하는 한 줄짜리 stderr 힌트가 출력됨 — 십중팔구 사용자가 빌드 산출물을 함께 스캔하는 중. exit code에 영향 없음; stderr로 보내므로 json/sarif 머신 출력은 깨끗하게 유지.)
- New `@aicqtools/guardrail` exports: `applyRuleConfig`, `resolveIgnores`, `ApplyRuleConfigResult`. (Korean: `@aicqtools/guardrail` 신규 export — `applyRuleConfig`, `resolveIgnores`, `ApplyRuleConfigResult`.)
- New i18n keys (en/ko): `cli.check.largeScanHint`, `cli.check.unknownRuleId`, `cli.check.noisyRuleHint`, `cli.rules.suggest.snippetBanner`, `cli.rules.suggest.patternDraftsBanner`, `cli.rules.suggest.experimentalLabel`. (Korean: 신규 i18n 키 6종 (en/ko 양측 추가).)
- New test fixtures and suites: `default-exclude.test.ts` (build-artifacts-repo fixture + `.gitignore` opt-in + DEFAULT_EXCLUDE allow-list of migrations), `suppressions.test.ts` (16 cases across TS/JS/TSX/Python + every directive form + malformed input), `apply-rule-config.test.ts` (off/warn/error/unknown-id), `path-exclude.test.ts` (designated wrapper convention + Windows backslashes + user-rule paths), `no-magic-number-skips.test.ts` (JSX/enum/index/for/callee/file globs), `no-process-env-leak-config-files.test.ts` (`next.config.ts` and friends). (Korean: 신규 테스트 fixture 및 suite 6개 추가 — `default-exclude.test.ts`(build-artifacts-repo fixture + `.gitignore` opt-in + DEFAULT_EXCLUDE의 migrations 허용 검증), `suppressions.test.ts`(TS/JS/TSX/Python 16 케이스 + 모든 디렉티브 형태 + malformed 입력), `apply-rule-config.test.ts`(off/warn/error/unknown-id), `path-exclude.test.ts`(designated wrapper 컨벤션 + Windows 백슬래시 + 사용자 룰 경로), `no-magic-number-skips.test.ts`(JSX/enum/index/for/callee/파일 글롭), `no-process-env-leak-config-files.test.ts`(`next.config.ts` 외).)

### Changed
- `@aicqtools/guardrail` adds `micromatch ^4.0.8` as a direct dependency (was transitive via `fast-glob`) and `@types/micromatch ^4.0.9` as a dev dependency, used for `pathExclude` glob matching. (Korean: `@aicqtools/guardrail`이 `micromatch ^4.0.8`을 direct 의존성으로 승격(이전엔 `fast-glob` 경유 전이 의존성)하고 `@types/micromatch ^4.0.9`를 dev 의존성으로 추가 — `pathExclude` 글롭 매칭에 사용.)
- `parseYamlRule` now correctly preserves both `messageKo` AND `docs` when both are present (the previous ternary chain dropped one). (Korean: `parseYamlRule`이 `messageKo`와 `docs` 둘 다 존재할 때 양쪽 모두 보존하도록 수정(이전 삼항 체인은 한쪽을 떨어뜨렸음).)
- `formatSuggestYaml(report)` accepts an optional `locale` second argument (defaults to `'en'` so existing call-sites compile unchanged). (Korean: `formatSuggestYaml(report)`이 두 번째 인자로 선택적 `locale`을 받음(기본값 `'en'`이라 기존 호출 지점은 그대로 컴파일됨).)

### Verification
- `pnpm -w build` / `typecheck` / `test` / `lint` all green on Windows 11. (Korean: `pnpm -w build` / `typecheck` / `test` / `lint` Windows 11에서 모두 green.)
- Guardrail tests: 191 pass (was 140 at alpha.6) — 51 new across 6 new files; 0 regressions. (Korean: Guardrail 테스트 191개 통과(alpha.6 시점 140 → +51, 6개 신규 파일에 분산); 회귀 0건.)
- CLI tests: 8 pass; version test updated to alpha.7. (Korean: CLI 테스트 8개 통과; version 테스트는 alpha.7에 맞춰 갱신.)
- Real-project dogfood (TalkUp monorepo, no config): frontend `filesScanned` 798 → 430 (−46%), `totalDiagnostics` 46,530 → **756** (−98.4%); `no-direct-openai` 1 → 0 (false positive eliminated); `camelcase-migration-column` 2 → 2 (migrations still visible); `@aicq/parse-failed` 0 (no alpha.5 regression). (Korean: 실 프로젝트 도그푸드(TalkUp 모노레포, config 없음) — frontend `filesScanned` 798 → 430 (−46%), `totalDiagnostics` 46,530 → **756** (−98.4%); `no-direct-openai` 1 → 0(false positive 해소); `camelcase-migration-column` 2 → 2(migrations 여전히 가시); `@aicq/parse-failed` 0(alpha.5 회귀 없음).)

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

[Unreleased]: https://github.com/aicqtools/aicqtools/compare/v1.0.0-alpha.7...HEAD
[v1.0.0-alpha.7]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.7
[v1.0.0-alpha.6]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.6
[v1.0.0-alpha.5]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.5
[v1.0.0-alpha.4]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.4
[v1.0.0-alpha.3]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.3
[v1.0.0-alpha.2]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.2
[v1.0.0-alpha.1]: https://github.com/aicqtools/aicqtools/releases/tag/v1.0.0-alpha.1
