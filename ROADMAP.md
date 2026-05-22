# Roadmap / 로드맵

> 본 로드맵은 의사 진척(false progress)을 피하기 위해 **정량 게이트**로만 작성합니다. 날짜는 best-effort이고 게이트 충족이 진입 조건입니다.

## 🇰🇷 한국어

### 현재 상태 (2026-05-22 기준)

- **버전:** `1.0.0-beta.2` (5 패키지 모두 npm publish 완료, dist-tag `latest` = `beta`)
- **phase:** 베타 phase 2 — framework 동결, BREAKING 0 강제 유지
- **dogfood:**
  - TalkUp 3 모듈 (frontend 742 / backend 2,865 / admin 179 — 0 delta 유지, 사용자 환경 회귀 검증)
  - Next.js 공식 `with-typescript` (재dogfood: 11 files / 2 violations / FP 0건 — beta.1 HTTP status 19개 추가 효과 검증 완료)
  - Nest.js 공식 `typescript-starter` (신규: 7 files / 2 violations / FP 1건은 beta.2에서 해소)
- **테스트:** guardrail **308** / provenance **47** / CLI **51** 모두 green (Windows 11)

### 1.0.0 stable 진입 정량 게이트

1.0.0 stable 진입은 아래 4개 게이트를 **모두** 충족할 때만 진행합니다. 누락 시 베타 phase 연장.

| # | 게이트 | 측정 방법 | 현재 |
|---|------|---------|-----|
| G1 | 외부 dogfood repo ≥ 2 | TalkUp + 외부 1개 이상에서 alpha→beta 동안 0 delta 회귀 검증 | **2/2 ✓** (TalkUp + Nest.js typescript-starter) |
| G2 | npm weekly downloads ≥ 200 | npm-stat API 기준 `@aicqtools/cli` 주간 평균 | 자동 측정 중 (`.github/workflows/monitor-npm.yml`, 매주 월요일 cron) |
| G3 | issue 처리율 ≥ 70%, P1 미해결 = 0 | GitHub issue 라벨 `severity:P1` 미해결 0건 + closed/open ≥ 0.7 | 정책 수립 완료 (`docs/policy/issue-triage.md`), issue 수집 진행 중 |
| G4 | 베타 soak 2 cycle 무중단 | beta.x → beta.(x+1) 사이 BREAKING 0건, 사용자 보고 P0 0건 | **2/2 ✓** (beta.1 → beta.2: 0 BREAKING / 0 P0 보고) |

### 베타 phase 정책 (1.0.0-beta.x 전체)

- **framework 동결** — public surface (CLI bin/exports, guardrail/core/rule-sdk index 표면) 변경 금지
- **BREAKING 0 강제** — 베타 안에서 사용자 코드 깨지는 변경 금지
- **허용되는 변경** — additive default 확장, bug fix, docs, internal refactor (외부 영향 0)
- **release 정책** — CHANGELOG / GitHub Release / plan release copy 모두 한·영 bilingual

### 1.0.0-beta.2 마일스톤 (✅ 완료, 2026-05-22 publish)

방향: **베타 phase 내에서 가능한 additive 개선만 — framework 동결 준수.** 결과: 4개 게이트 중 G1·G4 충족, G2·G3 측정 인프라 가동.

- ✅ **Article 50 리포터 ↔ guardrail 검출 결과 통합** — `Article50Report.guardrailSummary?` 옵션 필드 + CLI `--guardrail-result <path>` flag + HTML/PDF 제3섹션 렌더링 (한·영 i18n). JSON schema `0.1` 유지, additive only. (Sub 3a/3b/3c, ~330 LoC, provenance 테스트 +12 / cli +4.)
- ✅ **외부 dogfood +1** — Next.js with-typescript 재dogfood (FP 0건 확인) + Nest.js typescript-starter 신규 (case-study 한·영 작성). G1 게이트 2/2 충족.
- ✅ **추가 additive default 확장** — `route-needs-rate-limit`의 빌트인 spec/test 파일 default skip (Nest dogfood FP 해소). 회귀 가드 6건.
- ✅ **모니터링 인프라** — `monitor-npm.yml` (G2 추적) + `docs/policy/issue-triage.md` (G3 정책).

### 1.0.0-beta.3+ 마일스톤 후보 (베타 soak 계속, 사용자 피드백 우선)

방향: **G2/G3 측정 데이터 누적 + 외부 사용자 피드백 수집. 큰 신규 기능 없음.**

- (검토) 외부 dogfood 후보 추가 — Express/Hono/Fastify 공식 starter 중 1~2건. G1을 2 → 3+로 확장 시 한국 stack 외 cross-framework 안정성 강화.
- (검토) `monitor-npm.yml` 자동 issue 생성 결과 누적 후 G2 도달 추세 확인.
- (검토) `severity:P1` open issue 발생 시 1 cycle 내 fix (`docs/policy/issue-triage.md` §3 SLA).
- (검토) 사용자 보고 false positive 누적 시 추가 룰별 default skip 또는 옵션화.

### 1.1 계획 (1.0.0 stable 진입 후 ≥ 6주 뒤)

방향: **한국 도메인 룰 확장 + 도입 마찰 추가 감소.**

- 한국 IT 컨벤션 룰 +5 후보
  - 토스 페이먼츠 idempotency-key 검증
  - 카카오/네이버 SDK init 순서 (mobile init 전 access)
  - 한국 사업자등록번호 검증 (formatBusinessRegistration)
  - 주민등록번호 입력 필드 마스킹 (frontend rule)
  - KRW 화폐 floor/ceil 패턴 (Banker's rounding 강제)
- 금감원 가이드라인 추가 룰 후보 (1~2개)
- `aicq fix` 자동 수정 (현재는 검출만, 일부 룰에 한정해 autofix 도입)
- VS Code 확장 PoC

### 1.2 계획 (정량 충족 시)

방향: **한국 LLM 생태계 직접 지원.**

- 한국 LLM SDK 가이드 룰 팩 (solar / HyperCLOVA)
- MCP 모드 한국어 prompt 템플릿 추가
- baseline benchmark (공개) 자동 갱신 — 한국 SaaS / 핀테크 stack별 precision/recall

### Non-goals (안 하는 것 명시)

- ESLint / TypeScript / next lint 대체 — aicqtools는 **AI 코드 가드레일 레이어**이며 기존 도구를 끄지 않습니다.
- AI 코드 생성 자체 — 본 도구는 **검증**만 수행.
- 글로벌 도메인 룰 (예: GDPR Article 17 자동 검사) — 한국 + EU 컴플라이언스 중심을 유지.
- 클로즈드 소스 / SaaS hosted 버전 — MIT OSS 유지.

---

## 🇬🇧 English

### Current status (as of 2026-05-22)

- **Version:** `1.0.0-beta.2` (5 packages on npm, dist-tag `latest` = `beta`)
- **Phase:** Beta phase 2 — framework freeze, zero BREAKING upheld
- **Dogfood:**
  - TalkUp 3 modules (frontend 742 / backend 2,865 / admin 179 — 0 delta upheld, user-environment regression run)
  - Next.js official `with-typescript` (re-dogfood: 11 files / 2 violations / 0 FPs — confirms beta.1's 19 RFC HTTP status code additions resolved the prior FPs)
  - Nest.js official `typescript-starter` (new: 7 files / 2 violations / 1 FP resolved in beta.2)
- **Tests:** guardrail **308** / provenance **47** / CLI **51** all green (Windows 11)

### 1.0.0 stable entry gates (quantitative)

We progress to 1.0.0 stable only when **all four** gates below are met. If any gate misses, the beta phase is extended.

| # | Gate | Measurement | Current |
|---|------|-------------|---------|
| G1 | External dogfood repos ≥ 2 | TalkUp + at least one external repo with 0 delta regression across alpha→beta | **2/2 ✓** (TalkUp + Nest.js typescript-starter) |
| G2 | npm weekly downloads ≥ 200 | `@aicqtools/cli` average per npm-stat API | auto-measured (`.github/workflows/monitor-npm.yml`, weekly Monday cron) |
| G3 | Issue closure ≥ 70%, open P1 = 0 | GitHub label `severity:P1` open = 0, plus closed/open ≥ 0.7 | policy in place (`docs/policy/issue-triage.md`), intake in progress |
| G4 | Beta soak ≥ 2 cycles, no breakage | Between beta.x → beta.(x+1): 0 BREAKING, 0 user-reported P0 | **2/2 ✓** (beta.1 → beta.2: 0 BREAKING / 0 P0 reports) |

### Beta phase policy (entire 1.0.0-beta.x line)

- **Framework freeze** — no changes to public surface (CLI bin/exports, guardrail/core/rule-sdk index surface)
- **Zero BREAKING enforced** — no user-code-breaking changes inside beta
- **Allowed** — additive default extensions, bug fixes, docs, internal refactors (zero external impact)
- **Release policy** — CHANGELOG / GitHub Release / plan release copy all bilingual (Korean + English)

### 1.0.0-beta.2 milestone (planned)

Direction: **Additive-only improvements within the beta-phase freeze.** Outcome: gates G1 and G4 met; G2/G3 measurement infrastructure live.

- ✅ **Article 50 reporter ↔ guardrail detection integration** — `Article50Report.guardrailSummary?` optional field + CLI `--guardrail-result <path>` flag + third HTML/PDF section (ko/en i18n). JSON schema stays at `0.1`, additive only. (Sub 3a/3b/3c, ~330 LoC; provenance tests +12 / cli +4.)
- ✅ **One more external dogfood** — Next.js with-typescript re-dogfood (0 FPs verified) + first-time Nest.js typescript-starter (bilingual case study). G1 gate met (2/2).
- ✅ **Further additive default extensions** — built-in spec/test skip for `route-needs-rate-limit` (resolves the Nest dogfood FP). 6 regression-guard tests.
- ✅ **Monitoring infrastructure** — `monitor-npm.yml` (G2 tracking) + `docs/policy/issue-triage.md` (G3 policy).

### 1.0.0-beta.3+ milestone candidates (continued beta soak, user feedback first)

Direction: **Accumulate G2/G3 measurement data + collect external user feedback. No major new features.**

- (under review) Add another external dogfood candidate — one or two of the Express/Hono/Fastify official starters. Pushing G1 from 2 to 3+ broadens cross-framework stability beyond the Korean stack.
- (under review) Track G2 trend once `monitor-npm.yml` accumulates a few weeks of auto-issues.
- (under review) Fix any `severity:P1` open issue within one cycle (`docs/policy/issue-triage.md` §3 SLA).
- (under review) Convert recurring user-reported false positives into either built-in skips or per-rule options.

### 1.1 plan (≥ 6 weeks after 1.0.0 stable)

Direction: **Expand Korean-domain rules + reduce onboarding friction further.**

- 5 additional Korean IT-convention rule candidates
  - Toss Payments idempotency-key enforcement
  - Kakao / Naver SDK init ordering (no access before init)
  - Korean business registration number validation (formatBusinessRegistration)
  - Resident registration number input field masking (frontend rule)
  - KRW currency floor/ceil pattern (banker's rounding)
- 1–2 additional FSC (금감원) guideline rules
- `aicq fix` autofix for a constrained set of rules (currently detection only)
- VS Code extension PoC

### 1.2 plan (gated on quantitative criteria)

Direction: **First-class support for the Korean LLM ecosystem.**

- Korean LLM SDK guideline rule pack (solar / HyperCLOVA)
- Korean-language MCP-mode prompt templates
- Auto-refreshed public baseline benchmark — precision/recall per Korean SaaS/fintech stack

### Non-goals (explicitly out)

- Replacing ESLint / TypeScript / `next lint` — aicqtools is an **AI-code guardrail layer** that complements, not replaces, existing tooling.
- AI code generation — this tool **verifies**, never generates.
- Global-domain rules (e.g. automated GDPR Article 17 enforcement) — focus stays on Korea + EU compliance.
- Closed-source / SaaS-hosted version — remains MIT OSS.
