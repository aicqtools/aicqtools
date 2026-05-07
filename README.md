# AICQ Tools — AI Code Quality Platform (working name)

AI 바이브코딩으로 생성된 코드를 결정론적으로 검증하는 통합 코드 품질 플랫폼. 가드레일 엔진, 출처 추적기, 의존성 검증기를 단일 모노레포로 운영한다.

> 통합 브랜드는 Phase 5(2026-Q4)에 결정. 그전까지 임시 organization/scope 명 `aicqtools` 사용.
> CLI 명령(`aicq check`)과 사용자 프로젝트의 `aicq.config.yaml` 파일명·`aicq/rules/` 디렉토리명은 그대로 유지.

## 모듈

| 모듈 | 상태 | 설명 |
|------|------|------|
| `modules/guardrail` | Phase 0 | 결정론적 룰 엔진 (YAML + JS/TS 함수) |
| `modules/provenance` | Phase 0 | AI 코드 출처 추적기 (EU AI Act 대응) |
| `modules/supply-chain` | placeholder | 의존성 신뢰도 검증 (Phase 4) |

## 공통 패키지

| 패키지 | 설명 |
|--------|------|
| `packages/core` | tree-sitter 파서·캐시·리포터·설정 로더 (3개 모듈 공유) |
| `packages/rule-sdk` | 사용자 룰 작성 SDK (`defineRule()`) |
| `packages/cli` | 통합 CLI 진입점 (`aicq check` / `aicq provenance`) |

## 빠른 시작 (Phase 0 PoC)

```bash
pnpm install
pnpm build
pnpm test
```

## CI / pre-commit 통합 (Phase 1a)

### GitHub Action (PR 자동 검사)

`.github/workflows/aicq-check.yml`:
```yaml
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aicqtools/aicqtools/packages/action@main
        with: { locale: ko }
```

자세한 옵션은 [packages/action/README.md](packages/action/README.md).

### pre-commit (husky)

```bash
pnpm add -D husky
pnpm exec husky init
echo 'npx aicq check' > .husky/pre-commit
```

husky/lefthook 두 가지 방법은 [docs/pre-commit-setup.md](docs/pre-commit-setup.md) 참조.

자세한 내용은 [상세 계획 문서](../../Claude%20Data/AI%20packages/) 참조.

## 라이선스

MIT
