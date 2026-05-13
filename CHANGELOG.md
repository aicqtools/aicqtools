# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned (Phase 1b finish ~2026-09-15)
- Split `@aicq/parse-failed` into `@aicq/parse-failed` + `@aicq/rule-error` once enough data accumulates on which path fails more often.
- Cursor SQLite extraction: scope which workspace `state.vscdb` to read by matching `<hash>/workspace.json`'s `folder` URI against the cwd (currently best-effort, takes the most-recent DB regardless of project).
- `aicq rules suggest`: pattern-mining v2 — generalize literal arguments, dedupe near-equivalent shapes, optionally re-evaluate the user's own `rulesDir` rules.
- Full per-rule options framework: rule-specific zod-validated option schemas plumbed through `RuleContext.options`, with auto-generated doc tables. Alpha.7 wired the `rules: off|warn|error` map but per-rule options are still hardcoded inside each rule.
- Nested `.gitignore` / dedicated `.aicqignore` support. Alpha.7 honors only the root `.gitignore`, opt-in via `respectGitignore: true`.
- `@aicq/unused-suppression`: an info-severity diagnostic when an `aicq-disable-*` directive matched zero diagnostics (mirrors ESLint's `--report-unused-disable-directives`).

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
