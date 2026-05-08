<div align="right">

[**한국어**](CONTRIBUTING.md) | [English (below)](#contributing-english)

</div>

# 기여 가이드 (한국어)

aicqtools에 관심 가져 주셔서 감사합니다. 이 문서는 PR과 이슈 작성 기본 절차, DCO sign-off 정책, 룰 작성 가이드를 정리합니다.

## 시작하기

```bash
git clone https://github.com/aicqtools/aicqtools.git
cd aicqtools
pnpm install
pnpm build
pnpm test
```

요구 사항: Node.js 20 LTS+, pnpm 10+, Git 2.40+. Windows에서는 [Phase 0 빌드 함정](docs/troubleshooting-windows.md) 참조 (예정).

## 이슈 / PR 작성

- **버그 리포트**: [Bug report 템플릿](.github/ISSUE_TEMPLATE/bug_report.yml)
- **새 룰 제안**: [Rule request 템플릿](.github/ISSUE_TEMPLATE/rule_request.yml)
- **PR**: [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)의 체크리스트 모두 충족 부탁드립니다.

## DCO sign-off 정책

aicqtools는 [Developer Certificate of Origin](https://developercertificate.org/) (DCO) sign-off를 사용합니다. CLA bot은 사용하지 않으며, 모든 commit은 다음 형식으로 sign-off되어야 합니다.

```bash
git commit -s -m "feat: add my-rule"
# 자동으로 마지막 줄에 추가:
#   Signed-off-by: Your Name <your.email@example.com>
```

**왜 DCO인가**: CLA보다 가볍고(별도 동의 절차·DB 불필요), Linux/Git 생태계 표준이며, Open Core BSL 전환에도 충분합니다 (Phase 5 통합 브랜드 결정 시 재평가).

PR에 sign-off가 누락된 commit이 있으면 다음 명령으로 보완하실 수 있습니다:
```bash
git rebase --signoff main
git push --force-with-lease
```

## 룰 작성 가이드

### 1. 룰 종류 선택

| 종류 | 적합한 경우 | 예 |
|------|-----------|-----|
| **YAML 패턴** | 단일 AST 노드 매칭 (tree-sitter S-expression) | `no-direct-openai`, `no-pickle` |
| **JS/TS 함수** | 복잡한 조건, 컨텍스트(파일 경로 등) 활용 | `route-needs-rate-limit`, `no-process-env-leak` |

### 2. 파일 위치

빌트인 룰: `modules/guardrail/src/rules-default/<rule-id>.{ts,yaml}` + `index.ts`에 등록.
사용자 룰: 자신의 프로젝트의 `aicq/rules/<rule-id>.{mjs,ts}`.

### 3. 메타데이터 필수 항목

- `id` — kebab-case (예: `no-magic-number`)
- `language` — 단일 또는 배열 (`'typescript'` / `['typescript','javascript','tsx']`)
- `severity` — `'error' | 'warning' | 'info'`
- `message` — 영문, 명령형
- `messageKo` — 한국어, 명령형 (한국 IT 컨벤션 룰은 필수)
- `docs` — (선택) 룰 docs URL

### 4. 단위 테스트

각 룰당 최소 1개 통과 + 1개 위반 케이스를 `modules/guardrail/src/__tests__/<category>-rules.test.ts`에 추가.

### 5. False positive 정책

PoC 단계 룰은 false positive를 허용합니다 — known limitations를 룰 docs에 명시하면 됩니다. 정밀도는 출시 후 커뮤니티 피드백으로 점진적 개선합니다.

## 코드 스타일

- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- 룰 파일은 `defineRule()` SDK를 사용 (`@aicqtools/rule-sdk`)
- import는 named import 우선 (룰 `prefer-named-imports` 자체 적용 ☺)
- 단위 테스트는 Vitest + tree-sitter 픽스처

## 행동 강령

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)을 따릅니다 (Contributor Covenant 2.1).

---

# Contributing (English) <a id="contributing-english"></a>

Thanks for your interest in aicqtools. This document covers PR/issue basics, the DCO sign-off policy, and rule authoring guidelines.

## Getting started

```bash
git clone https://github.com/aicqtools/aicqtools.git
cd aicqtools
pnpm install
pnpm build
pnpm test
```

Requirements: Node.js 20 LTS+, pnpm 10+, Git 2.40+. Windows pitfalls live in [`docs/troubleshooting-windows.md`](docs/troubleshooting-windows.md) (forthcoming).

## Issues / PRs

- **Bug reports**: [Bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **New rule proposals**: [Rule request template](.github/ISSUE_TEMPLATE/rule_request.yml)
- **PRs**: please complete every item in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## DCO sign-off

aicqtools uses [Developer Certificate of Origin](https://developercertificate.org/) sign-offs (no CLA bot). Every commit must be signed off:

```bash
git commit -s -m "feat: add my-rule"
# Adds the trailer:
#   Signed-off-by: Your Name <your.email@example.com>
```

If your branch has commits without sign-off, fix them with:

```bash
git rebase --signoff main
git push --force-with-lease
```

## Rule authoring

- **YAML pattern** for single-node tree-sitter S-expression matches (e.g. `no-direct-openai`).
- **JS/TS function** for complex conditions or context (file path, etc.) (e.g. `route-needs-rate-limit`).

Built-in rules live at `modules/guardrail/src/rules-default/<id>.{ts,yaml}`; user rules go in `aicq/rules/<id>.mjs` in the consumer project.

Required metadata: `id` (kebab-case), `language`, `severity`, `message` (English, imperative), `messageKo` (Korean, imperative — required for Korean convention rules), optional `docs`.

Unit tests: at least one passing + one violating case per rule under `modules/guardrail/src/__tests__/`.

False positives are accepted at alpha; document known limitations in the rule's markdown page. Precision improves after release with community feedback.

## Code style

TypeScript runs with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. Use the `defineRule()` SDK from `@aicqtools/rule-sdk`. Prefer named imports.

## Code of Conduct

We follow the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
