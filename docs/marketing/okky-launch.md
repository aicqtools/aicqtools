# OKKY 사전 글 초안

> https://okky.kr/ 게시용. **토론형 + Q&A** 톤. GeekNews보다 캐주얼하고 한국 개발자 커뮤니티의 실 고민을 자극. **사용자(소장님)가 직접 게시.**

---

## 제목 옵션

1. `AI가 짠 코드, 결국 어떻게 검증하세요? — 결정론적 가드레일 50개 룰 OSS 공개`
2. `AI 코드 어시스턴트가 사내 규칙을 자꾸 어겨서 만든 도구 (한국 도메인 룰 20개 포함)`
3. `금감원 AI 가이드라인 + PCI DSS를 룰셋으로 정형화 — aicqtools v1.0.0-beta.2 공개`

→ **추천: 옵션 1** (질문형 + 후킹, OKKY 톤에 가장 잘 맞음)

## 본문

```markdown
안녕하세요. 한국 IT에서 5년차 풀스택 개발자입니다.

요즘 AI 코드 어시스턴트(Cursor, Claude Code 등)로 코드 짜는 분들 많으실 텐데, 제 경험으로는 **사내 규칙을 자꾸 어기는 게 진짜 골치**더라구요. 예를 들어:

- LLM 클라이언트는 사내 싱글톤 쓰라고 CLAUDE.md에 적어놨는데도 AI는 매번 `new OpenAI()` 직접 호출
- 새 라우트에 `rateLimit` 미들웨어 까먹음
- `console.log`로 PII가 운영에 새는 일 (디버그하다 그대로 PR 올림)
- `cardNumber`를 평문 컬럼에 저장 (감사관이 알면 PCI DSS § 3.2 위반)
- KST 타임존 명시 안 한 `new Date()` (UTC로 저장돼서 7시간 어긋남)
- 한글 파일명 다운로드에 RFC 5987 인코딩 안 해서 IE에서 깨짐
- 금감원 AI 가이드라인의 "AI 결정에 audit log 필수"를 모르고 작성

이런 게 코드 리뷰에서 매번 잡히는 게 너무 비효율적이라, 결정론적으로 검증하는 가드레일을 만들었습니다. **GitHub: https://github.com/aicqtools/aicqtools**

## 핵심 차별화

1. **LLM 호출 없는 결정론적** — Codacy Guardrails / Greptile은 LLM 기반 확률적이라 "이번엔 통과, 다음엔 실패" 같은 비일관성. aicq는 tree-sitter 기반 AST 분석으로 100% 통과/실패.

2. **한국 도메인 룰 20개** — 글로벌 도구가 흉내 못 내는 영역:
   - **한국 IT 컨벤션 7개**: camelCase 마이그레이션, KST 타임존, ₩ 천단위, RFC 5987 한글 파일명, Naver/Kakao OAuth WebView, 한국어 주석 인코딩
   - **금감원 AI 가이드라인 5개**: 감사 로그, PII 마스킹, 모델 버전 추적, 인간 개입 포인트, 설명가능성 메타데이터
   - **PCI DSS 8개**: 카드번호 평문 저장 금지, CVV 로깅 금지, TLS 1.2+ 강제, PG 응답 검증, 결제 멱등키 필수, 환불 권한 분리, 트랜잭션 로그, 카드번호 마스킹

3. **MCP 네이티브** — AI 코드 어시스턴트의 MCP 서버로 등록하면 **AI가 코드를 만들기 전 차단** (사후 검증이 아닌 사전). 글로벌 가드레일 도구들은 PR 시점에 코멘트 다는 사후 패턴.

4. **하이브리드 룰 DSL** — 간단한 패턴은 YAML 5줄, 복잡한 룰은 TS 함수 (`defineRule({ visitors: { call_expression: ... } })`).

5. **출처 추적기 모듈** — Git pre-commit으로 AI 코드 어시스턴트 세션 자동 캡처 → CycloneDX AI-BOM + EU AI Act Article 50 transparency 마킹·출처 리포트 (한·영 HTML/PDF). **시행일 2026-08-02 대응** (직접 적용 대상은 provider/deployer로 한정 — 한국 SaaS는 EU 진출 시 선제 대비).

## 라이선스 / 가격

- 엔진은 **MIT OSS**, 영구 무료
- 유료 구독(클라우드 대시보드 등 부가 기능)은 **v1.5 공개 시점에 결정 예정** — 베타 단계에서는 OSS 무료만 운영

## 검증 / 케이스 스터디

한국 상용 모노레포 **205,069 LOC** (backend 91k + frontend 82k + admin 31k)에 적용해서 7개 핵심 AI 바이브코딩 패턴을 정형화했습니다:
- https://github.com/aicqtools/aicqtools/blob/main/docs/case-studies/talkup-30k.md

5/7 패턴은 즉시 검출, 변형 패턴 2건은 v1.5 type-aware 도입 시 정밀도 보강 예정 — 베타 단계로 솔직히 표시했습니다.

## 도입 절차

1. `aicq sync-ai-rules` — 50개 룰을 `.cursorrules` / `CLAUDE.md`에 자동 주입 (AI가 코드 생성 단계에서 더 정확)
2. MCP 등록 — `~/.claude/mcp_settings.json`에 aicq 추가 (Claude Code prompt 시점 차단)
3. pre-commit hook — husky/lefthook으로 저장소 진입 차단
4. GitHub Action — PR 자동 코멘트

자세한 내용: docs/pre-commit-setup.md, docs/mcp-claude-code-setup.md

## 토론 부탁드립니다

다음 점이 가장 궁금합니다 — 한국 IT 팀에서 일하시는 분들의 의견을 듣고 싶어요:

1. **금감원 AI 가이드라인 매핑이 핀테크에 실제로 도움될 것 같나요?** 현재는 5개 룰인데 추가하면 좋을 항목이 있을까요?
2. **PCI DSS 8개 룰**은 결제 통합 라인업을 다루는데 누락된 게 있나요? (예: 토큰화 라이브러리 강제, 카드번호 변수명 화이트리스트 등)
3. **한국 IT 컨벤션 7개** 외에 "이건 진짜 자주 어겨서 룰로 만들어야 한다" 싶은 패턴 있으면 알려주세요. (예: Mybatis namespace 컨벤션, Sequelize transaction wrap 강제 등)
4. **MCP 서버 등록**해 보신 분 계시면 prompt 시점 차단 효과 어땠는지 궁금합니다.
5. **유료 모델 의견** — v1.5 시점 도입 예정인 부가 기능(클라우드 대시보드 등)에 대해, 한국 IT 팀이 선호하는 과금 방식(repo당 정액 / per-seat / 사용량 기반)은 어떤가요?

OSS라 PR / 이슈도 환영합니다. 한국 IT 팀의 실전 룰 큐레이션이 가장 도움이 됩니다.
```

---

## 게시 팁

- OKKY는 GeekNews보다 **본문 길이 허용 범위가 넓음** — 1000자 정도까지 자연스러움
- 첫 줄에 **자기소개 + 문제 상황** 명확히 (캐주얼)
- **이모지 사용 자제** (OKKY는 평문 선호, 단 핵심 강조 굵게)
- **마지막에 토론 질문 던지기** — 댓글 활동 유도
- **부정적 비교 자제** — "Codacy 별로다" 보다 "Codacy는 LLM 기반이고 우리는 결정론적, 둘 다 트레이드오프"

## 예상 질문 / 대답 (GeekNews와 별도 추가 분)

- **Q**: 우리 회사는 자체 룰셋이 있는데 어떻게 통합하나요?
  - **A**: `aicq.config.yaml`에 `rulesDir: 'aicq/rules'` 명시하면 디렉토리의 .ts/.yaml 룰을 자동 로드. 기존 룰셋과 병합 가능.
- **Q**: AI 에이전트 룰 동기화는 어떻게 작동?
  - **A**: `aicq sync-ai-rules` 명령이 룰 50개의 message + messageKo + 위반 예제를 `.cursorrules`와 `CLAUDE.md`에 주입. AI가 컨텍스트로 받아서 위반 코드 생성 빈도가 줄어듭니다 (정확한 효과는 dogfooding 측정 중).
- **Q**: tree-sitter 한국어 식별자 처리 OK?
  - **A**: tree-sitter는 UTF-8 입력 그대로 처리. 한국어 변수명/주석 모두 OK. 단 인코딩이 EUC-KR이면 `enforce-utf8-encoding` 룰이 잡습니다.
- **Q**: 기여 어떻게?
  - **A**: GitHub Issue Template (Rule Proposal)에 ID/카테고리/위반 예제/통과 예제 작성. CONTRIBUTING.md에 DCO sign-off (`git commit -s`) 권장.
