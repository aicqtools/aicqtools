# aicqtools — 1페이지 요약 (의사결정자용)

> AI가 짠 코드를 결정론적으로 검증하는 한국 IT 컨벤션·금감원 AI 가이드라인 룰 기반 OSS 코드 품질 도구.
> KS마크 + HACCP의 코드 버전. 한국 IT 컨벤션 + 금감원 AI 가이드라인 + EU AI Act Article 50 영역을 한 도구에서 함께 다루는 시도 (현재 베타 단계).

**npm**: `@aicqtools/cli@beta` (v1.0.0-beta.1, 2026-05-21 게시) | **라이선스**: MIT | **상태**: 베타 (1.0.0 stable 직전)

---

## 1. 문제

AI 어시스턴트(Claude Code · Cursor · Copilot)가 짠 코드는 **컴파일은 되지만 회사 정책·법규·도메인 룰을 반복 위반**합니다.

- **Veracode 2025** — AI 생성 코드의 **24.7~45%에서 보안 결함**
- **Tenzai 2025** — AI 자동 적용 CSRF·보안 헤더 **0%**
- ESLint·SonarQube — 글로벌 IT 관례만 다룸. **한국 도메인 룰 0개, 금감원 가이드라인 0개**
- AI 도구로 AI 코드를 검증 (CodeRabbit, Greptile) — **같은 LLM 계열이 같은 맹점 공유**

## 2. 해결 — aicqtools가 메우는 영역

| 영역 | 룰 수 | 예시 |
|---|---|---|
| 한국 IT 컨벤션 | **7** | KST 명시, 깨진 한글 검출, 한글 파일명 RFC 5987, 카카오/네이버 OAuth WebView, 원화 천단위, UTF-8 강제, Sequelize 마이그레이션 컬럼 |
| 금감원 AI 가이드라인 | **5** | PII 마스킹, 설명가능성, AI 감사 로그, 인간 감독 체크포인트, 모델 버전 추적 |
| PCI DSS | **8** | 카드번호 평문 금지, 결제 멱등성, TLS 1.2+ |
| 글로벌 (TS·Python) | **22** | `no-direct-openai`, `no-process-env-leak`, `route-needs-auth`, `requests-needs-timeout` |
| 코드베이스 도그푸드 | **8** | `controller-needs-async-wrapper`, `api-response-shape` |
| **합계** | **50** | + EU AI Act Article 50 한·영 리포트 + AI-BOM(CycloneDX 1.6) |

## 3. 차별점 — 글로벌 도구 대비

| 항목 | aicqtools | CodeRabbit | Codacy/SonarQube | ESLint AI |
|---|---|---|---|---|
| 한국 IT 룰 | **7** | 0 | 0 | 0 |
| 금감원 AI 가이드라인 | **5** | 0 | 0 | 0 |
| 한국어 UI | **97.8% native** | 영어 | 영어 | 영어 |
| EU AI Act Article 50 메타데이터 리포트 | **있음** (한국어, guardrail 검출 결과 통합은 beta.2 예정) | 없음 | 없음 | 없음 |
| 결정론적 (LLM 미사용) | **O** | X | 부분 | O |
| 가격 | **MIT OSS** | 유료 SaaS | 유료 SaaS | 부분 무료 |

## 4. 검증된 실사용 (도그푸드)

- **TalkUp (한국 핀테크 모노레포, 205,069 LOC)** — frontend 742 / backend 2,865 / admin 179건 위반 검출, 베타.1에서 0 regression
- **Next.js 공식 `with-typescript`** — 외부 dogfood, false positive 1건만 (베타 직후 fix)
- **Windows 11 + macOS + Linux** — 모두 green

## 5. 도입 비용

```bash
npm install --save-dev @aicqtools/cli
npx aicq init --stack next     # 또는 nest | capacitor | generic
npx aicq check --locale ko     # 첫 검사 — 10K LOC 모노레포 ~3초
```

- **CI 통합** — GitHub Actions 1줄, pre-commit 훅, MCP(Claude Code/Cursor) 네이티브
- **첫 도입 공수** — 1팀 기준 반나절 (config + CI + 초기 위반 트리아지)
- **유지 비용** — repo당 추가 비용 0 (OSS)

## 6. 다음 단계

| 단계 | 액션 | 소요 |
|---|---|---|
| 1 | `npx aicq init` + `npx aicq check` 로컬 시범 | 30분 |
| 2 | 위반 결과 검토 + `aicq.config.yaml` 튜닝 | 2시간 |
| 3 | GitHub Action 워크플로 활성화 | 30분 |
| 4 | (선택) MCP 등록 → Claude Code 코드 생성 *전* 룰 컨텍스트 주입 | 1시간 |

**연락처**: GitHub Discussions (응답 시간 24시간 내) | **저장소**: https://github.com/aicqtools/aicqtools (현재 비공개 베타 — 도입 문의 시 별도 안내) | **문서**: README ko·en + 룰 docs 한·영
