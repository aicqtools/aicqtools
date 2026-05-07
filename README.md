# AICQ — AI Code Quality Platform (working name)

AI 바이브코딩으로 생성된 코드를 결정론적으로 검증하는 통합 코드 품질 플랫폼. 가드레일 엔진, 출처 추적기, 의존성 검증기를 단일 모노레포로 운영한다.

> 통합 브랜드는 Phase 5(2026-Q4)에 결정. 그전까지 임시명 `aicq` 사용.

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
pnpm test
```

자세한 내용은 [상세 계획 문서](../../Claude%20Data/AI%20packages/) 참조.

## 라이선스

MIT
