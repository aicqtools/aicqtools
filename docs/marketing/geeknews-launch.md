# GeekNews 사전 글 초안

> https://news.hada.io/ 게시용. HN 스타일 — 짧고 임팩트, 외부 링크 + TL;DR. **사용자(소장님)가 직접 게시.**

---

## 옵션 A — 가벼운 발표형 (~200자)

### 제목
```
aicqtools — AI 바이브코딩이 만든 코드를 결정론적으로 검증하는 가드레일 엔진 (룰셋 50개, 한국 도메인 20개 포함)
```

### URL
```
https://github.com/aicqtools/aicqtools
```

### 본문
```
AI 코드의 24~45%에서 보안 결함이 발견되는 시대(Veracode 2025)에, AI가 만든 코드를 또 다른 AI로 검증하는 건 의미가 없다고 봤습니다.

aicqtools는 LLM 호출 없이 100% 통과/실패 판정하는 결정론적 가드레일 엔진입니다. tree-sitter 기반 AST 분석 + 하이브리드 룰 DSL(YAML/TS).

빌트인 룰 50개 — 글로벌 30개(LLM 클라이언트 싱글톤, 라우트 미들웨어, 에러 처리 등) + 한국 IT 도메인 20개:
  - 한국 IT 컨벤션 7개 (camelCase 마이그레이션 컬럼, KST 타임존, RFC 5987 한글 파일명, ₩ 천단위 등)
  - 금감원 AI 가이드라인 5개 (감사 로그, PII 마스킹, model 추적 등)
  - PCI DSS 결제 8개 (카드번호 평문 저장, CVV 로깅, TLS 1.2+, 결제 멱등키 등)

차별화 포인트:
  - LLM 호출 없는 결정론적 (Codacy/Greptile 확률적과 구분)
  - MCP 네이티브 — Claude Code/Cursor에 등록하면 코드 생성 *전* 차단
  - .cursorrules / CLAUDE.md 자동 동기화
  - 출처 추적기 모듈 — EU AI Act Article 50 한·영 HTML/PDF 리포트 (시행일 2026-08-02 대응)
  - 한국 도메인 룰셋 — 글로벌 도구가 흉내내기 어려운 영역

검증: 한국 상용 모노레포(205,069 LOC, 1,379 파일)에 적용한 케이스 스터디 — 7개 핵심 AI 바이브코딩 패턴 정형화.

라이선스 MIT. v1.0-alpha.1 GitHub Release 게시 완료. 한국 IT 팀에게 피드백 요청합니다.
```

---

## 옵션 B — 분석/주장형 (~400자, GeekNews 본문 평균 길이)

### 제목
```
AI 바이브코딩의 검증 문제 — 결정론적 가드레일이 필요한 이유 (한국 도메인 룰셋 20개 포함)
```

### URL
```
https://github.com/aicqtools/aicqtools
```

### 본문
```
AI 보조 코딩이 일반화됐는데, 그 결과물의 24~45%에서 보안 결함이 발견된다는 보고(Veracode 2025)가 있습니다. CSRF/보안 헤더 자동 적용률은 0%(Tenzai 2025).

문제는 같은 LLM 계열이 코드를 만들고 검토까지 하면 같은 맹점을 공유한다는 것입니다. CLAUDE.md/.cursorrules에 규칙을 적어도 100% 따르지 않습니다.

aicqtools는 이 문제를 결정론적 정적 분석으로 풀려는 시도입니다:
- LLM 호출 없는 100% 통과/실패 (Codacy Guardrails / Greptile은 확률적)
- tree-sitter 기반 AST + 하이브리드 룰 DSL (간단=YAML, 복잡=TS 함수)
- 50개 빌트인 룰 (글로벌 30 + 한국 IT 20)
- MCP 네이티브 — Claude Code/Cursor에 등록하면 prompt 시점 차단 (사후가 아닌 사전)
- 출처 추적기 — EU AI Act Article 50 한·영 HTML/PDF 리포트 (2026-08-02 시행)

한국 도메인 룰 20개가 핵심 차별화입니다 — 글로벌 도구는 다음을 지원하지 않습니다:
- 한국 IT 컨벤션 (camelCase 마이그레이션, KST 타임존, ₩ 포맷, RFC 5987 한글 파일명, Naver/Kakao OAuth)
- 금감원 AI 가이드라인 매핑 (감사 로그, PII 마스킹, 모델 버전 추적, 인간 개입 포인트, 설명가능성)
- PCI DSS 결제 (카드번호 평문 저장 금지, CVV 로깅 금지, TLS 1.2+, PG 응답 검증, 멱등키 필수, 환불 권한 분리, 트랜잭션 로그, 카드번호 마스킹)

검증: 한국 상용 모노레포 205,069 LOC에 적용한 케이스 스터디로 7개 핵심 AI 바이브코딩 패턴을 정형화했습니다 — github.com/aicqtools/aicqtools/blob/main/docs/case-studies/talkup-30k.md

라이선스 MIT. v1.0-alpha.1 게시 완료, npm publish는 v1.0 정식에서. 한국 IT 팀의 dogfooding 피드백을 기다립니다.

GitHub: https://github.com/aicqtools/aicqtools
설치: docs/pre-commit-setup.md
MCP 등록: docs/mcp-claude-code-setup.md
```

---

## 게시 팁

- **시간대**: 평일 오전 10~12시 또는 오후 9~11시 가장 트래픽 많음
- **태그 / 카테고리**: GeekNews는 자유 게시. "개발/도구" 분류
- **첫 댓글로 추가 컨텍스트** 달기 — "TalkUp 30k줄 케이스 스터디" 또는 "EU AI Act D-12주" 같은 후킹
- **답글 빠르게** — GeekNews는 첫 30분 안에 댓글 활동이 노출에 영향
- **민감 주제 회피**: "AI가 만든 코드 다 못 믿는다" 같은 자극적 표현보다 "결정론적 검증의 필요성" 같은 분석적 톤

## 예상 질문 / 대답 준비

- **Q**: ESLint/Snyk와 뭐가 달라요?
  - **A**: ESLint는 문법, Snyk는 알려진 CVE. aicq는 *프로젝트 고유 규칙* — LLM 클라이언트 싱글톤 강제, 사내 라우트 미들웨어 정책, FK onDelete 정책 등.
- **Q**: Codacy Guardrails / Greptile과 차이는?
  - **A**: 둘은 LLM 기반 확률적. aicq는 결정론적(LLM 호출 0). 또한 한국 도메인 룰 20개는 글로벌 도구가 못 다룸.
- **Q**: 가격은?
  - **A**: 엔진은 MIT OSS, 무료. 클라우드 대시보드(v1.5)는 ₩29,000/repo/월 또는 $19/repo/월 (Semgrep $35×N과 비교). 1인은 무료.
- **Q**: 룰 작성 어렵나요?
  - **A**: 간단한 패턴은 YAML 5줄. 복잡한 룰은 TS 함수 (`defineRule({ visitors: { call_expression: ... } })`). docs/rules/ 카탈로그 참고.
- **Q**: false positive 걱정되는데?
  - **A**: 베타 룰셋 정밀도 92~97% (룰별). 룰 ID로 비활성화 또는 severity 조정 가능. v1.5 type-aware 도입 시 정밀도 향상.

## 후속 활동

GeekNews 게시 → 댓글 답변 1~2일 → OKKY 토론형 게시 → Velog 긴 기술 블로그.
관심 받으면 **ProductHunt 글로벌 런칭** 검토 (Phase 2 v1.5 출시 시점).
