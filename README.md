<div align="right">

[**한국어**](README.md) | [English](README.en.md)

</div>

# aicqtools

> **AI가 만든 코드를 결정론적으로 검증하는 코드 품질 도구.**
> 가드레일 룰 50개 + AI 출처 추적 + EU AI Act Article 50 리포트를 한 번에.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/alpha.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-v1.0.0--alpha.2-orange.svg)](CHANGELOG.md)

> **결정론적**(deterministic) — LLM 호출 없이 같은 입력에 항상 같은 결과를 내는 방식. Codacy/Greptile 같은 확률적 도구와 반대로 CI에서 안정적으로 동작합니다.

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
**2026-08-02부터** EU에 서비스하는 모든 AI 시스템은 학습 데이터 · 모델 · 운영자 정보를 **기계 가독 형식으로 문서화**해야 합니다. 한국 스타트업도 EU 진출 시 의무 적용. aicqtools는 Claude Code/Cursor 세션을 자동 감지해 AI-BOM(AI Bill of Materials — 사용된 모델/버전/라이선스 명세서, CycloneDX 1.6 포맷)과 Article 50 리포트(HTML/PDF)를 자동 생성합니다.

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
npm install --save-dev @aicqtools/cli

# 2. 첫 검사
npx aicq check --locale ko
# 출력 예시:
# ✗ src/routes/api.ts:42  no-console-log  warning
#   → 프로덕션 코드에서 console.log 사용을 피하세요. logger를 쓰세요.
# ✗ src/db/schema.ts:18   no-plain-card-number  error
#   → 평문 card_number 컬럼은 _encrypted 접미사가 필요합니다 (PCI DSS § 3.5.1).

# 3. AI 에이전트에 룰 자동 주입
npx aicq sync-ai-rules --locale ko
# → .cursorrules / CLAUDE.md 가 50개 룰 요약으로 갱신됨
# → Claude Code/Cursor가 다음 코드 생성 시 이 컨텍스트를 사용

# 4. (선택) AI 세션 기록 — EU AI Act 대비
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
| **2026-05 (현재)** | v1.0.0-alpha.2 — 50 룰, MCP, Article 50 HTML/PDF |
| 2026-08-01 | v1.0 stable — EU AI Act 시행일 직전 |
| 2026-09-15 | Phase 1b 완료 — Cursor SQLite 추출, 룰 자동작성 프로토타입 |
| 2026-10-27 | v1.5 SaaS 베타 — 대시보드, PR 자동 코멘트 |

---

## 라이선스 / 기여

MIT — [LICENSE](LICENSE). 버그 제보 · 룰 PR 환영합니다. 기여 가이드는 추후 `CONTRIBUTING.md`로 추가 예정.
