# Velog 사전 글 초안 (긴 기술 블로그)

> https://velog.io/ 게시용. **긴 기술 블로그** 톤 — 코드 스니펫 + 스크린샷 + 깊이 있는 분석. **사용자(소장님)가 직접 게시.**

---

## 제목

```
AI가 짠 코드를 또 다른 AI로 검증할 수 있을까 — 결정론적 가드레일 엔진을 만든 이유
```

대안 제목:
- `Cursor가 사내 규칙을 자꾸 어겨서 만든 도구 — aicqtools 50개 룰 OSS 공개`
- `금감원 AI 가이드라인을 코드 룰셋으로 정형화하기 — aicqtools 케이스 스터디`

## 태그

```
#AI #바이브코딩 #가드레일 #코드품질 #결정론적정적분석 #tree-sitter #한국IT #금감원 #PCI-DSS #EU-AI-Act #OSS #MCP
```

## 본문

```markdown
## TL;DR

- AI 보조 코딩 결과의 24~45%에서 보안 결함 발견 (Veracode 2025), CSRF/보안 헤더 자동 적용률 0% (Tenzai 2025)
- 같은 LLM 계열이 코드를 만들고 검증까지 하면 같은 맹점 공유 → **결정론적** 정적 분석이 필요
- 우리는 **aicqtools** v1.0-alpha를 만들었습니다 — 50개 빌트인 룰, 한국 도메인 20개, MCP 네이티브
- GitHub: https://github.com/aicqtools/aicqtools (MIT 라이선스)

---

## 1. 우리가 매번 마주친 7가지 패턴

작년부터 Cursor / Claude Code로 코드 짜는 빈도가 80% 넘었습니다. 그러다 보니 코드 리뷰에서 자꾸 같은 패턴이 잡혔습니다.

### 패턴 1 — LLM 클라이언트 직접 인스턴스화

사내 표준은 `llmClient` 싱글톤(레이트리밋 + 로깅 + 에러 정책 통일)인데, AI는 매번 직접 인스턴스화:

\`\`\`ts
// AI가 자주 만드는 코드
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
\`\`\`

CLAUDE.md에 "사내 llmClient만 써라"고 적어놨는데도 매번 까먹습니다.

### 패턴 2 — `console.log`로 PII 운영 누출

\`\`\`ts
console.log('user', user, 'token', token);  // PR 리뷰에서 자주 누락
\`\`\`

### 패턴 3 — `id` 네임스페이스 덮어쓰기

\`\`\`ts
// id는 publicId로 바꾸려고 시도하지만 spread 때문에 internal id 보존됨
const out = { ...user, id: user.publicId };
\`\`\`

### 패턴 4 — 새 라우트의 미들웨어 누락

\`\`\`ts
// rateLimit, asyncWrapper 빠짐
router.post('/api/feedback', async (req, res) => { ... });
\`\`\`

### 패턴 5 — `async` 핸들러의 에러 전파 누락

\`\`\`ts
// asyncWrapper 없으면 unhandled rejection으로 프로세스 죽음
router.post('/foo', async (req, res) => { throw new Error('test'); });
\`\`\`

### 패턴 6 — FK `onDelete` 정책 누락

\`\`\`ts
// 정책 명시 안 된 FK
references: { model: 'users', key: 'id' }
\`\`\`

### 패턴 7 — API 응답 형식 불일치

\`\`\`ts
res.json({ result: items });  // 표준은 { success, data, message }
\`\`\`

이 7개 패턴이 우리 모노레포(**205,069 LOC**, backend + frontend + admin)에서 반복적으로 발견됐습니다. ESLint는 문법, Snyk는 알려진 CVE만 잡으니 *프로젝트 고유 규칙*은 검출 못 합니다.

---

## 2. 왜 LLM 기반 검증으로는 부족한가

이 시점에 Codacy Guardrails (LLM 기반), Greptile (자연어 룰), Surmado (STANDARDS.md 앵커) 같은 **확률적** 검증 도구들이 등장했습니다. 다 좋은 도구인데, 우리 사례에서 한계가 있었습니다:

1. **비결정성** — 같은 코드를 두 번 검증하면 다른 결과. CI에서 "운 좋게 통과"가 발생.
2. **모델 맹점 공유** — 우리가 쓰는 Cursor가 Claude면, 검증도 Claude로 하는 구조에서 같은 맹점을 공유.
3. **API 비용** — 검증마다 LLM 호출하면 PR 1건당 토큰 비용. CI 트리거 시마다 결제.
4. **느림** — LLM round-trip은 평균 3~10초. tree-sitter는 수 ms.

그래서 결정론적 도구가 필요했습니다. tree-sitter 기반 AST 분석 + 명시적 룰셋으로.

---

## 3. aicqtools 설계

### 차별화 7가지

1. **결정론적** — LLM 호출 0, 100% 통과/실패
2. **MCP 네이티브** — Claude Code/Cursor에 등록하면 코드 생성 *전* 차단
3. **AI 에이전트 룰 자동 동기화** — `.cursorrules` / `CLAUDE.md`에 룰 50개 주입
4. **하이브리드 룰 DSL** — 간단=YAML, 복잡=TS 함수
5. **한국 도메인 룰셋 20개** ★ — 글로벌 도구가 못 따라오는 영역
6. **출처 추적기 모듈** — EU AI Act Article 50 한·영 HTML/PDF 리포트
7. **repo당 과금** — Semgrep $35 × 인원 모델 대비 repo당 정액

### 빌트인 룰 50개 카테고리

| 카테고리 | 갯수 | 예시 |
|---------|-----|------|
| TS 글로벌 | 20 | no-direct-openai, route-needs-rate-limit, no-id-overwrite, fk-needs-on-delete, api-response-shape |
| Python 글로벌 | 10 | requests-needs-timeout, no-pickle, no-shell-true, no-fstring-sql |
| 한국 IT 컨벤션 | 7 | camelcase-migration-column, explicit-kst-timezone, won-format-thousands, rfc5987-korean-filename, naver-kakao-oauth-webview |
| 금감원 AI 가이드라인 | 5 | audit-log-ai-decision, mask-pii-in-ai-prompt, track-ai-model-version, human-oversight-checkpoint, ai-explainability-metadata |
| PCI DSS | 8 | no-plain-card-number, no-cvv-logging, require-tls-1-2-plus, verify-pg-response, require-idempotency-key, separate-refund-permission, preserve-transaction-log, mask-card-number |

### 룰 정의 예시 (TS 함수)

\`\`\`ts
import { defineRule } from '@aicqtools/rule-sdk';

export default defineRule({
  id: 'audit-log-ai-decision',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'AI inference call must be paired with an audit log entry (FSC AI guideline).',
  messageKo: 'AI 추론 호출은 감사 로그가 필수입니다 (금감원 AI 가이드라인).',
  visitors: {
    function_declaration(node, ctx) {
      const text = ctx.textOf(node);
      const usesAi = /\\b(openai|anthropic|aiClient)\\.\\w+/.test(text);
      const hasLog = /\\b(logger|auditLog|audit)\\.\\w+|\\bconsole\\.(log|info|warn|error)/.test(text);
      if (usesAi && !hasLog) ctx.report({ node });
    },
  },
});
\`\`\`

### 룰 정의 예시 (YAML 패턴)

\`\`\`yaml
id: no-direct-openai
language: typescript
severity: error
message: Use the llmClient singleton. Direct OpenAI instantiation is forbidden.
messageKo: llmClient 싱글톤을 사용하세요. 직접 OpenAI 인스턴스화 금지.
pattern:
  kind: new_expression
  match: 'new OpenAI($...)'
\`\`\`

---

## 4. 한국 도메인 룰셋 — 핵심 차별화

글로벌 가드레일 도구는 다음을 지원하지 않습니다:

### 한국 IT 컨벤션 7개 예시

\`\`\`ts
// 위반: snake_case migration column
await queryInterface.createTable('users', { user_name: { type: 'STRING' } });
// 통과: camelCase
await queryInterface.createTable('users', { userName: { type: 'STRING' } });
\`\`\`

\`\`\`ts
// 위반: KST 명시 안 함
const s = d.toLocaleString('ko-KR');
// 통과
const s = d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
\`\`\`

\`\`\`ts
// 위반: 한글 파일명 그대로 Content-Disposition
res.setHeader('Content-Disposition', 'attachment; filename="보고서.csv"');
// 통과: RFC 5987
res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''%EB%B3%B4%EA%B3%A0%EC%84%9C.csv");
\`\`\`

### 금감원 AI 가이드라인 5개 예시

\`\`\`ts
// 위반: AI 호출 후 audit log 없음
async function decide(input) {
  return await openai.chat.completions.create({ model: 'gpt-4', messages: [...] });
}

// 통과
async function decide(input) {
  const result = await openai.chat.completions.create({ model: 'gpt-4', messages: [...] });
  logger.info('ai-decision', { result, input });
  return result;
}
\`\`\`

### PCI DSS 8개 예시

\`\`\`ts
// 위반: 카드번호 평문 컬럼
await queryInterface.createTable('payments', { card_number: { type: 'STRING' } });
// 통과
await queryInterface.createTable('payments', { card_number_encrypted: { type: 'STRING' } });
\`\`\`

\`\`\`ts
// 위반: pay() 함수에 idempotencyKey 없음
async function pay(amount) { return await stripe.charges.create({ amount }); }
// 통과
async function pay(amount, idempotencyKey) {
  return await stripe.charges.create({ amount }, { idempotencyKey });
}
\`\`\`

---

## 5. MCP 네이티브 — 코드 생성 *전* 차단

대부분의 가드레일 도구는 **사후** 검증 (PR 단계 코멘트, pre-commit hook). aicq는 **사전** 차단을 지원합니다.

`~/.claude/mcp_settings.json`에 aicq를 등록하면:

\`\`\`json
{
  "mcpServers": {
    "aicq": {
      "command": "aicq",
      "args": ["mcp"]
    }
  }
}
\`\`\`

Claude Code가 코드를 만들기 전에 aicq가 룰을 노출 → AI가 룰을 인지한 채로 생성. 이게 .cursorrules / CLAUDE.md 동기화와 결합되면 위반 빈도가 크게 줄어듭니다 (정확한 효과는 dogfooding 중).

---

## 6. 출처 추적기 — EU AI Act 대응

EU AI Act는 **2026-08-02 시행**입니다. Article 50은 AI 생성 텍스트의 machine-readable 마킹을 요구합니다.

aicq의 출처 추적기 모듈은:

\`\`\`bash
# Claude Code 세션 자동 캡처
aicq provenance capture --reader claude-code

# Article 50 한·영 HTML 리포트
aicq provenance report aicq/provenance/today.json \\
  --format article-50-html --locale ko

# Article 50 PDF (puppeteer optional, 감사관 친화적)
aicq provenance report today.json \\
  --format article-50-pdf --locale ko --output report.pdf

# CycloneDX 1.6 AI-BOM 표준
aicq provenance report today.json --format ai-bom
\`\`\`

EU AI Act + 한국 컴플라이언스 (금감원 AI 가이드라인)을 같은 도구로 처리할 수 있습니다.

---

## 7. 검증 / 도입 절차

### 케이스 스터디

한국 상용 모노레포 **205,069 LOC** (backend 91k + frontend 82k + admin 31k)에 적용. 7개 핵심 AI 바이브코딩 패턴 정형화. 5/7 즉시 검출, 2/7 변형 패턴은 v1.5 type-aware 도입 시 보강.

전체: https://github.com/aicqtools/aicqtools/blob/main/docs/case-studies/talkup-30k.md

### 도입 4단계

1. **AI 에이전트 룰 동기화 먼저**: `aicq sync-ai-rules` → `.cursorrules` / `CLAUDE.md` 갱신
2. **MCP 등록**: prompt 시점 차단
3. **pre-commit hook**: husky / lefthook
4. **GitHub Action**: PR 자동 코멘트

각 단계는 docs/pre-commit-setup.md, docs/mcp-claude-code-setup.md에 step-by-step 가이드.

---

## 8. 라이선스 / 가격

- 엔진은 **MIT OSS** — 영구 무료
- 클라우드 대시보드(v1.5 예정) — **₩29,000/repo/월** (Semgrep Team $35 × 인원 모델 대비 repo당 정액)
- 1인 개발자 무료
- Enterprise (SSO + 감사 로그 + EU AI Act 리포트) — 맞춤 가격

## 9. 다음 단계

- v1.0 정식 출시 (~2026-09): npm publish, Phase 1b 마무리, 룰 50개 외 사용자 룰 마켓플레이스
- v1.5 클라우드 베타 (~2026-10): 대시보드 + PR 자동 코멘트 + Stripe 결제

## 10. 피드백 부탁드립니다

GitHub Issue Template (Rule Proposal)이 있습니다. 한국 IT 팀의 실전 룰 큐레이션이 가장 도움이 됩니다:
- 우리 팀에서 자주 어겨지는 패턴이 있나요?
- 금감원 AI 가이드라인 매핑이 도움될 항목이 더 있나요?
- PCI DSS 8개 룰 중 누락된 게 있나요?

GitHub: https://github.com/aicqtools/aicqtools  
케이스 스터디: docs/case-studies/talkup-30k.md  
설치 가이드: docs/pre-commit-setup.md
```

---

## 게시 팁

- Velog는 **긴 글 + 마크다운 + 코드 스니펫 + 이미지** 모두 자유. 우리 본문 그대로 OK.
- **Cover 이미지** — aicqtools 로고 또는 룰 카탈로그 스크린샷 활용 (선택)
- **시리즈 등록** — "AI 코드 가드레일 시리즈"로 후속 글(K2 룰셋 깊이있게, MCP 통합 가이드, 출처 추적기) 연결 가능
- **댓글 활성화** — 댓글에 GitHub 링크 다시 한 번 + Issue 환영
- **태그 12개 이상** — Velog 검색 노출에 영향
- **하루 1회 publish 추천** — 트래픽 분산 → 한 번에 모두 노출되는 것보다 long-tail이 좋음
