<div align="right">

[**한국어**](README.md) | [English](README.en.md)

</div>

# aicqtools

> **AI가 만든 코드를 결정론적으로 검증하는 코드 품질 도구.**
> 가드레일 룰 50개 + AI 출처 추적 + EU AI Act Article 50 리포트를 한 번에.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/beta.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-v1.0.0--beta.2-blue.svg)](CHANGELOG.md)
[![EU AI Act Article 50](https://img.shields.io/badge/EU%20AI%20Act%20Article%2050-D--72%20(2026--08--02)-orange.svg)](docs/eu-ai-act-data-requirements.md)

> **결정론적**(deterministic) — LLM 호출 없이 같은 입력에 항상 같은 결과를 내는 방식. Codacy/Greptile 같은 확률적 도구와 반대로 CI에서 안정적으로 동작합니다.

> ⏰ **EU AI Act Article 50 시행 D-73 (2026-08-02)** — AI 생성 코드를 EU 시장 대상 서비스에 쓰는 팀은 **공급자(provider)**라면 출력물 기계 가독 마킹, **배포자(deployer)**라면 공익 정보 텍스트 disclosure 의무를 집니다. aicqtools는 Claude Code/Cursor 세션을 자동 캡처해 Article 50 리포트(HTML/PDF, 한·영) + AI-BOM(CycloneDX 1.6)을 PR마다 생성 — 그 attribution을 같은 PR에 첨부하면 본 의무 이행의 출발선이 됩니다.

---

## 🇰🇷 왜 aicqtools인가? — 한국 IT 컨벤션·금감원 AI 가이드라인을 룰로 다루는 OSS 코드 품질 도구 (베타)

현재 베타 단계(1.0.0-beta.1)에서 다음 영역을 룰로 다룹니다. 글로벌 도구(CodeRabbit · Codacy · SonarQube · ESLint AI)는 한국 IT 룰·금감원 가이드라인·한국어 UI를 기본 제공하지 않습니다 (2026-05 공개 정보 기준):

- **한국 IT 컨벤션 룰 7개** — KST 타임존 명시, 깨진 한글 주석 검출, 한글 파일명 RFC 5987 Content-Disposition, Capacitor + 카카오/네이버 OAuth WebView 안티패턴, 원화 천단위 콤마, UTF-8 강제, Sequelize 마이그레이션 컬럼명 컨벤션.
- **금감원 AI 가이드라인 룰 5개** — AI 호출 전 주민번호/카드번호 마스킹, 설명가능성 메타데이터, AI 의사결정 감사 로그, 인간 감독 체크포인트, AI 모델 버전 추적. EU AI Act Article 50 메타데이터 리포트도 한국어로 렌더링됩니다 (guardrail 검출 결과 통합은 1.0.0-beta.2 예정). 한국·EU 컴플라이언스 영역을 한 도구에서 함께 다루는 시도입니다.
- **완전 한국어 i18n** — 룰 메시지 **44/45 = 97.8%** 한국어 native. `aicq check --locale ko` 또는 `LANG=ko_KR.UTF-8` 환경에서 CLI 출력 100% 한글. `aicq docs build` 시 룰 docs 한·영 동시 자동 생성.

| 항목 | aicqtools | CodeRabbit | Codacy/SonarQube | ESLint AI |
|---|---|---|---|---|
| 한국 IT 룰 | **7** | 0 | 0 | 0 |
| 금감원 AI 가이드라인 룰 | **5** | 0 | 0 | 0 |
| 한국어 UI | **97.8% native** | 영어만 | 영어만 | 영어만 |
| KST · 원화 · 한글파일명 | **O** | X | X | X |
| Naver/Kakao OAuth 안티패턴 | **O** | X | X | X |
| EU AI Act Article 50 메타데이터 리포트 | **있음** (한국어, 검출 결과 통합은 beta.2 예정) | 없음 | 없음 | 없음 |

---

### 🎯 일상 비유로 이해하기

aicqtools를 처음 접하시면 이렇게 생각하세요.

- **KS마크 + HACCP 인증의 코드 버전.** 콘센트에 KS마크가 있어야 한국 220V 환경에서 안전하듯, 코드에도 한국 환경에서만 통하는 표준(KST 시간대, 한글 인코딩, 원화 표기, 카카오·네이버 OAuth 패턴)이 있습니다. ESLint·SonarQube 같은 글로벌 도구는 110V용 검사기라 한국 룰을 못 찍어줍니다.
- **HACCP처럼 사고 전 차단.** 식품 공장이 HACCP으로 식중독균이 들어올 지점을 미리 짚어서 막듯, aicqtools는 AI 코드의 위해요소(주민번호가 ChatGPT 프롬프트에 그대로 들어감, AI 결정 근거 미기록, 모델 버전 추적 부재)를 PR 머지 *전에* 자동으로 짚어냅니다. 금감원 AI 가이드라인 5종을 룰로 만들었습니다.
- **자동차 정기검사처럼 매번 자동.** 자동차 2년 검사가 누적된 결함을 한 번에 드러내듯, GitHub PR이 올라올 때마다 aicqtools가 자동 검사를 돌립니다. 위반 있으면 머지 막힘 — 위험한 코드가 main에 절대 안 들어갑니다. ESLint·TypeScript와 **병행**(대체 아님) 운영.
- **정밀안전진단처럼 대규모 한 번에.** 30년 된 아파트의 구조·전기·배관을 한꺼번에 점검하듯, 50개 빌트인 룰로 한국 상용 모노레포(TalkUp, 205,069 LOC)를 한 번에 진단. 첫 검사 3초, SQLite 캐시 히트 후 20ms.

---

## 왜 만들었나

AI 어시스턴트(Claude Code · Cursor · Copilot)가 만든 코드는 문법은 맞아도 **회사 정책 · 법규 · 도메인 규칙을 반복적으로 위반**합니다. 이 격차를 메우는 게 aicqtools의 목적입니다.

### 1. AI 바이브코딩의 반복 패턴
ESLint는 일반적인 패턴은 잡지만 *"이 회사는 LLM 클라이언트를 항상 싱글톤으로 만든다"* 같은 프로젝트 고유 규칙은 못 잡습니다. aicqtools는 한국 SaaS 프로덕션 모노레포(TalkUp, 205,069 LOC)를 도그푸딩(자기 도구로 자기 코드 검사)해 추출한 7개 패턴을 시작점으로 50개 룰을 제공합니다.

### 2. 한국 도메인 룰 부재
Codacy · Semgrep · SonarQube 같은 글로벌 도구는 글로벌 IT 관례만 다룹니다. 한국 핀테크/스타트업이 필요한 영역은 비어 있습니다:
- **금감원 AI 가이드라인** — 개인정보 마스킹, AI 의사결정 감사 로그, 모델 버전 추적
- **PCI DSS** — 카드번호 평문 금지, 결제 멱등성(idempotency) 강제, TLS 1.2+
- **한국 IT 컨벤션** — KST 타임존 명시, 원화 천단위 콤마, RFC 5987 한글 파일명, Naver/Kakao OAuth WebView 패턴

aicqtools는 이 20개 한국 도메인 룰을 처음부터 번들링합니다.

### 3. EU AI Act Article 50 — 시행 D-3개월
**2026-08-02부터** EU에 서비스하는 AI 시스템의 **공급자(provider, GPAI 포함)**는 출력물을 **기계 가독 형식**으로 마킹하고, **배포자(deployer)**가 공익 정보 목적으로 publish하는 AI 생성 텍스트는 별도 disclosure 의무(50(4))를 집니다. 한국 사업자도 EU에 generative AI를 공급하거나 AI 출력을 EU 시장 대상으로 publish하면 동일하게 적용됩니다 (2026-08-02 이전 시장 출시된 generative AI는 **2026-12-02까지 유예**). aicqtools는 Claude Code/Cursor 세션을 자동 감지해 AI-BOM(AI Bill of Materials — 사용된 모델/버전/라이선스 명세서, CycloneDX 1.6 포맷)과 Article 50 리포트(HTML/PDF)를 자동 생성합니다.

---

## 무엇이 들어있나

### 가드레일 50개 룰

| 카테고리 | 룰 수 | 예시 |
|---------|------|------|
| TypeScript / JavaScript 글로벌 | 12 | `no-direct-anthropic`, `no-process-env-leak`, `route-needs-auth` |
| Python 글로벌 | 10 | `requests-needs-timeout`, `no-pickle`, `no-fstring-sql` |
| 한국 IT 컨벤션 | 7 | `explicit-kst-timezone`, `won-format-thousands`, `rfc5987-korean-filename` |
| 금감원 AI 가이드라인 | 5 | `mask-pii-in-ai-prompt`, `audit-log-ai-decision`, `track-ai-model-version` |
| PCI DSS | 8 | `no-plain-card-number`, `mask-card-number`, `require-tls-1-2-plus` |
| 코드베이스 도그푸드 | 8 | `no-console-log`, `api-response-shape`, `controller-needs-async-wrapper` |

10,000줄 모노레포 첫 검사 **3초**, SQLite 캐시 히트 후 **20ms**(150배 속도).

### AI 출처 추적

`aicq provenance capture`가 Git staged 변경과 활성 AI 세션을 함께 기록합니다.
- **Claude Code 네이티브 리더** — `~/.claude/projects/<encoded-cwd>/*.jsonl` 파싱, 사용 모델까지 추출
- **Cursor 감지 리더** — `state.vscdb`로 Cursor 사용 여부 확인 (전체 프롬프트 추출은 v1.0 stable에서)
- **수동 모드** — `.aicq/sessions.json`에 직접 기록

### 컴플라이언스 리포트

EU AI Act Article 50 양식(한국어/영어 이중) HTML, PDF(puppeteer 옵션 peer), AI-BOM(CycloneDX 1.6 JSON) 포맷을 동일 캡처 데이터에서 렌더링합니다.

---

## 5분 quickstart

```bash
# 1. 설치 — 대부분 이 패키지 하나면 충분합니다
#    베타 진입 — `@beta` 명시하지 않아도 `latest` tag로 베타가 받아집니다.
npm install --save-dev @aicqtools/cli
# 또는 명시적으로:
npm install --save-dev @aicqtools/cli@beta
# 알파를 핀하려면:
# npm install --save-dev @aicqtools/cli@alpha

# 2. 프로젝트에 aicq 도입 — config + CI 워크플로 한 번에 생성
npx aicq init --stack next   # 또는 nest | capacitor | generic
# → aicq.config.yaml 생성 (스택별 exclude/룰 프리셋)
# → .github/workflows/aicq-check.yml 생성 (CI 통합)

# 3. 첫 검사
npx aicq check --locale ko
# 출력 예시:
# ✗ src/routes/api.ts:42  no-console-log  warning
#   → 프로덕션 코드에서 console.log 사용을 피하세요. logger를 쓰세요.
# ✗ src/db/schema.ts:18   no-plain-card-number  error
#   → 평문 card_number 컬럼은 _encrypted 접미사가 필요합니다 (PCI DSS § 3.5.1).

# 4. AI 에이전트에 룰 자동 주입
npx aicq sync-ai-rules --locale ko
# → .cursorrules / CLAUDE.md 가 50개 룰 요약으로 갱신됨
# → Claude Code/Cursor가 다음 코드 생성 시 이 컨텍스트를 사용

# 5. (선택) AI 세션 기록 — EU AI Act 대비
npx aicq provenance capture --reader claude-code
```

CI(GitHub Actions) 통합은 [packages/action/README.md](packages/action/README.md), pre-commit 훅은 [docs/pre-commit-setup.md](docs/pre-commit-setup.md), MCP(Model Context Protocol — Claude Code/Cursor가 외부 도구를 호출하는 표준) 등록은 [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md)를 참고하세요.

---

## 설치 시 알아둘 점 — `tree-sitter` 단일 인스턴스

`@aicqtools/cli` 1.0.0-alpha.5+는 `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-python` 세 native 패키지를 자기 `dependencies`로 직접 명시하고, 내부 패키지들(`core` / `guardrail` / `rule-sdk`)은 이를 `peerDependencies`로 요구합니다. 이 구조로 npm/pnpm/yarn 모두 사용자 root에 **단일 native instance**를 hoist 합니다.

왜 필요한지: alpha.4까지는 각 패키지가 `tree-sitter`를 nested로 install했고, `tree-sitter-typescript`의 `peerOptional ^0.21` 때문에 npm이 root에 별개 사본을 hoist해 V8 isolate에 native binding이 여러 개 공존했습니다. typescript grammar는 cross-instance node 호출을 거부해 `.ts` 파일에서 `SyntaxNode must belong to a Tree` 에러가 났습니다 (TalkUp alpha.4 점검에서 329건 발생).

**alpha.4 이하를 계속 쓰는 경우 workaround:**

```json
// package.json (npm)
{ "overrides": { "tree-sitter": "0.22.4" } }

// package.json (pnpm)
{ "pnpm": { "overrides": { "tree-sitter": "0.22.4" } } }

// package.json (yarn)
{ "resolutions": { "tree-sitter": "0.22.4" } }
```

후 `npm install` (또는 `pnpm install` / `yarn`). single instance가 강제되어 동일한 효과.

---

## `aicq.config.yaml` 핵심 옵션

기본값만으로도 동작하지만, 실제 프로젝트에서 자주 쓰는 옵션 세 가지를 묶어 정리합니다. 전체 schema는 [`packages/core/src/config/schema.ts`](packages/core/src/config/schema.ts).

### `exclude` — 스캔에서 빠질 경로

```yaml
# aicq.config.yaml
exclude:
  - 'node_modules/**'
  - 'dist/**'
  - 'build/**'
  - '**/__generated__/**'
  - 'vendor/**'
```

`exclude`는 micromatch 글롭 목록입니다. 기본값은 일반적인 빌드 산출물·캐시(`.next/`, `coverage/`, `ios/`, `android/` 등)을 자동 제거하니, 거기 위에 프로젝트 고유 경로만 더하면 됩니다.

**언제 쓰나** — 빌드 산출물·자동 생성 코드·vendor 디렉토리를 통째로 빼고 싶을 때. 룰별 토글이 아니라 **모든 룰의 시야 자체를 줄이는** 가장 강력한 도구.

### `overrides` — 경로별 룰 on/off

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

- `paths`는 **글롭 OR 매치** 시맨틱(`micromatch.isMatch`). 알파.10부터 cwd 기준 auto-anchor (`scripts/**` → `**/scripts/**`).
- `paths`에 매치되는 파일에 한해 `rules` 맵을 적용. 기존 활성 룰 위에 덮어쓰기.

**negation은 silent no-op 함정** — `paths: ['src/**', '!src/app.ts']`처럼 ESLint식으로 쓰면 알파.11부터 stderr 경고가 한 줄 뜹니다 (`micromatch.isMatch`의 array OR 시맨틱이라 negation이 형제 positive glob을 빼주지 못함). **경로를 빼고 싶으면 최상위 `exclude:` 필드를 사용**.

### `skipBuiltinSkips` (alpha.13+) — 빌트인 자동 스킵 끄기

3개 빌트인 룰(`no-console-log` / `no-empty-catch` / `no-magic-number`)은 내부에 자체 정규식 가드가 있어 `scripts/`·`native-bridge.js`·`__tests__/` 같은 관례 경로에서 자동으로 스킵됩니다. 빌트인 스킵이 과도하다고 느낄 때만 꺼세요:

```yaml
skipBuiltinSkips: true  # 빌트인 가드 무력화, 룰은 모든 파일에서 fire
```

CLI flag로 한 번만 끄기:

```bash
aicq check --skip-builtin-skips     # 끄기
aicq check --no-skip-builtin-skips  # 강제 켜기 (config가 true여도)
```

기본값 `false` — 알파.10~12 동작 그대로. `aicq rules suggest` 출력의 `↳ auto-skipped paths:` 줄로 어떤 패턴이 적용되는지 미리 볼 수 있습니다.

### `reportUnusedSuppressions` (alpha.17+) — 안 쓰이는 suppression 청소

`aicq-disable-line` / `aicq-disable-next-line` / `aicq-disable-file` 디렉티브가 한 번도 위반을 잡지 못하면 info-severity `@aicq/unused-suppression` 진단을 띄워 줍니다. ESLint `--report-unused-disable-directives` 패턴.

```yaml
reportUnusedSuppressions: true
```

```bash
aicq check --report-unused-suppressions     # 한 번만 켜기
aicq check --no-report-unused-suppressions  # 강제 끄기
```

기본값 `false` (opt-in). synthetic 진단이라 `rules.@aicq/unused-suppression: off` 같은 식으로는 못 끕니다 — 이 옵션 자체를 `false`로 두거나 CLI flag로 한 번만 끄세요.

### per-rule options (alpha.14+) — 룰별 하드코드 상수 사용자 조정

여섯 개 빌트인 룰이 `options` 필드로 사용자 조정을 허용합니다 — defaults는 알파.13 동작과 비트 단위 동일이라 config 미설정 시 회귀 0:

```yaml
modules:
  guardrail:
    rules:
      # alpha.14: 매직 넘버 허용 목록 (default 11개)
      no-magic-number:
        options:
          allowedNumbers: ['0', '1', '-1', '2', '60', '3600', '86400']

      # alpha.15: 어떤 console 메서드를 검출할지 (default ['log'])
      no-console-log:
        options:
          flagMethods: ['log', 'debug', 'warn']

      # alpha.15: 빈 catch 검출에서 스킵할 파일 정규식 (default = native-bridge/service-worker)
      no-empty-catch:
        options:
          skipFilePatterns:
            - '[/\\](native-bridge|service-worker)\.[jt]sx?$'
            - '[/\\]sentry-wrapper\.ts$'

      # alpha.16: Sequelize 외 ORM 마이그레이션 함수 추가
      camelcase-migration-column:
        options:
          migrationFunctions: ['createTable', 'addColumn', 'changeColumn', 'create_table']

      # alpha.16: PII 정규식 source 배열 (default = RRN + 카드번호)
      mask-pii-in-ai-prompt:
        options:
          piiPatterns:
            - '\b\d{6}-\d{7}\b'        # RRN
            - '\b(?:\d[ -]?){15,16}\b' # 카드번호
            - '\b[A-Z]\d{8}\b'         # 여권번호 (사용자 추가)

      # alpha.16: Python f-string SQL 키워드 (default 8개)
      no-fstring-sql:
        options:
          sqlKeywords: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE']
```

**알 수 없는 옵션 키** (예: `allowedNumberz`)는 stderr 경고로 알려주고 무시 (`.strict()` zod schema), **타입 위반**도 stderr 경고 후 defaults로 fallback. 잘못된 config가 점검을 멈추지 않습니다.

각 룰의 옵션 표는 `aicq docs build`로 자동 생성된 `aicq-docs/rules/{en,ko}/<rule-id>.md`에서 확인할 수 있어요.

### YAML PatternRule options (alpha.18+) — YAML 룰 framework 일관성

알파.18부터 YAML PatternRule(`.yaml` 파일)에도 `options.defaults: Record<string, unknown>`를 적을 수 있어요. runtime에 strict object schema가 자동 합성되므로 사용자가 `aicq.config.yaml`에서 override할 때 typo 키가 잡힙니다. 다만 query는 정적이라 옵션이 실제 매칭 로직에 substitution되지는 않음(v1.0+ 후속).

---

## 패키지 5종 (npm `@aicqtools` 스코프)

| 패키지 | 용도 |
|--------|------|
| [`@aicqtools/cli`](packages/cli) | `aicq` 바이너리 — 사용자가 실제로 설치하는 패키지 |
| [`@aicqtools/guardrail`](modules/guardrail) | 룰 엔진 + 50개 빌트인 룰 |
| [`@aicqtools/provenance`](modules/provenance) | AI 세션 리더 + Article 50 / AI-BOM 렌더러 |
| [`@aicqtools/rule-sdk`](packages/rule-sdk) | 커스텀 룰 작성용 `defineRule()` 헬퍼 (ESLint의 `RuleCreate`와 비슷) |
| [`@aicqtools/core`](packages/core) | tree-sitter 파서 · SQLite 증분 캐시 · SARIF(Static Analysis Results Interchange Format — 정적 분석 결과 산업 표준 JSON) 리포터 · i18n |

대부분 사용자는 **`@aicqtools/cli` 하나만 설치**하면 됩니다. 나머지는 자동으로 의존성으로 끌려옵니다.

---

## 더 알아보기

- **GitHub Action**(PR 자동 검사) — [packages/action/README.md](packages/action/README.md)
- **MCP 등록** — [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md)
- **PDF 리포트 설정** — [docs/pdf-rendering.md](docs/pdf-rendering.md)
- **사례 연구**(TalkUp 205K LOC) — [docs/case-studies/talkup-30k.md](docs/case-studies/talkup-30k.md)
- **EU AI Act 데이터 요건** — [docs/eu-ai-act-data-requirements.md](docs/eu-ai-act-data-requirements.md)
- **변경 이력** — [CHANGELOG.md](CHANGELOG.md)

---

## 로드맵

| 시기 | 마일스톤 |
|------|---------|
| **2026-05 (현재)** | **v1.0.0-beta.1** — alpha.7~19 19 cycle 누적 자산 정식화, framework freeze, dist-tag `latest`=beta |
| 2026-06~07 | beta soak — 외부 dogfood ≥ 2, npm DL ≥ 200/주, P1 미해결 = 0 ([ROADMAP.md](ROADMAP.md) G1~G4) |
| 2026-08-01 | v1.0 stable 후보 — EU AI Act Article 50 시행일 직전 |
| 2026-10~ | 1.1 — 한국 IT 룰 +5 (토스 페이먼츠 idempotency, Kakao/Naver SDK init 순서 등), `aicq fix` autofix |
| 2026-Q4 | 1.2 — 한국 LLM SDK 룰 팩(solar/HyperCLOVA), VS Code 확장 |

상세 게이트와 non-goals: [ROADMAP.md](ROADMAP.md).

---

## 보안 / 기여 / 정책

- **보안 취약점 보고** — [SECURITY.md](SECURITY.md) (48h ack / 14d 영향 분류 / 30d 패치 SLA)
- **기여 가이드** — [CONTRIBUTING.md](CONTRIBUTING.md) (DCO sign-off + 룰 작성 가이드)
- **행동 강령** — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1)
- **데이터 처리 정책** — [docs/policy/data-handling.md](docs/policy/data-handling.md) (100% 로컬 실행, 텔레메트리 OFF, 금감원·PIPA·ISMS-P 대응)

---

## 라이선스

MIT — [LICENSE](LICENSE). 버그 제보 · 룰 PR 환영합니다.
