# 케이스 스터디 — TalkUp 코드베이스에 aicq 적용

> 실 프로덕션 모노레포(상용 한국 IT 서비스, **205,069 LOC**, 1,379 파일)에 aicq 가드레일 50개 룰을 적용한 결과를 정리합니다. 코드 스니펫은 모두 **익명화·일반화**되어 있으며, 실제 사내 코드는 공개되지 않았습니다.

## 1. 코드베이스 프로파일

| 영역 | 파일 수 | LOC |
|------|--------|-----|
| backend (Node.js + TypeScript) | 410 | **91,581** |
| frontend (React/Vue + TS/TSX) | 787 | **82,263** |
| frontend_admin (관리자 페이지) | 182 | **31,225** |
| **합계** | **1,379** | **205,069** |

> 참고 — 마케팅 메시지의 "30k줄"은 어드민(31k LOC) 1개 모듈 기준이었습니다. 실제 통합 코드베이스는 그 6배가 넘는 약 **20만 줄**입니다.

## 2. AI 바이브코딩에서 발견된 7개 핵심 패턴

이 프로젝트는 Claude Code / Cursor 등 AI 보조로 상당량을 작성했습니다. 결과적으로 ESLint·Snyk가 잡지 못하는 **프로젝트 고유 규칙**을 AI가 반복적으로 위반하는 패턴이 누적됐습니다. aicq의 첫 번째 룰셋은 정확히 이 7개 패턴에서 출발했습니다.

### 사례 1 — LLM 클라이언트 직접 인스턴스화

**문제**: AI가 새 라우트를 만들 때마다 `new OpenAI(...)`를 직접 호출. 사내 표준은 `llmClient` 싱글톤(레이트리밋 + 로깅 + 에러 정책 통일).

```ts
// ❌ AI가 자주 만드는 코드
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ 사내 표준
import { llmClient } from '@/lib/llmClient';
const reply = await llmClient.chat({ model: 'gpt-4', messages });
```

**aicq 룰**: `no-direct-openai`, `no-direct-anthropic` (severity: error)

### 사례 2 — `console.log`가 운영 빌드에 잔존

**문제**: AI가 디버그용 `console.log`를 `await`까지 끼워서 출력. PII가 stdout으로 새는 일이 잦았음.

```ts
// ❌
console.log('user', user, 'token', token);

// ✅
logger.debug('user.token.minted', { userId: user.id });
```

**aicq 룰**: `no-console-log` (severity: warning)

### 사례 3 — ID 네임스페이스 덮어쓰기

**문제**: 모델 객체의 `id`를 라우트 응답 단계에서 임의 재할당. AI는 "id를 빼서 클라이언트에 안 보내는" 패턴을 만들 때 흔히 같은 키에 다른 값을 덮어씀.

```ts
// ❌
const out = { ...user, id: user.publicId };  // user.id 정보 손실

// ✅
const { id: _internalId, ...rest } = user;
const out = { ...rest, id: user.publicId };
```

**aicq 룰**: `no-id-overwrite` (severity: error)

### 사례 4 — 새 라우트의 rateLimit 미들웨어 누락

**문제**: AI가 라우트를 추가할 때 미들웨어 체인을 빠뜨림. 사내 정책은 모든 외부 라우트에 `rateLimit` 강제.

```ts
// ❌
router.post('/api/feedback', async (req, res) => { ... });

// ✅
router.post('/api/feedback', rateLimit(60), asyncWrapper, async (req, res) => { ... });
```

**aicq 룰**: `route-needs-rate-limit`, `route-needs-auth` (severity: error)

### 사례 5 — async 핸들러의 에러 전파 누락

**문제**: AI가 컨트롤러 함수를 `async`로 감쌌지만 `asyncWrapper`(또는 `express-async-errors`) 체인이 빠져 unhandled rejection으로 프로세스가 죽거나 5xx가 안 잡힘.

```ts
// ❌
router.post('/foo', async (req, res) => { ... });

// ✅
router.post('/foo', asyncWrapper(async (req, res) => { ... }));
```

**aicq 룰**: `controller-needs-async-wrapper` (severity: error)

### 사례 6 — 외래키 onDelete 정책 누락

**문제**: AI가 마이그레이션을 만들 때 FK는 걸지만 `onDelete`/`onUpdate`를 빠뜨림. 사내 정책은 `cascade`/`restrict`/`set null` 중 하나를 명시해야 함.

```ts
// ❌
references: { model: 'users', key: 'id' }

// ✅
references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
```

**aicq 룰**: `fk-needs-on-delete` (severity: error)

### 사례 7 — API 응답 형식 일관성

**문제**: AI는 라우트마다 응답 구조를 약간씩 다르게 만듦 (`{ data }`, `{ result }`, `{ payload }`). 사내 표준은 `{ success, data, message }`.

```ts
// ❌
res.json({ result: items });

// ✅
res.json({ success: true, data: items, message: null });
```

**aicq 룰**: `api-response-shape` (severity: error)

## 3. 룰셋 카테고리 매핑 (50개)

aicq의 빌트인 룰셋 50개(v1.0.0-beta.2 기준)는 위 7개 사례를 코어로 일반화한 후 한국 IT 도메인까지 확장한 결과입니다.

| 카테고리 | 갯수 | TalkUp 적용 사례 |
|---------|-----|----------------|
| TS 글로벌 (LLM/라우트/에러/환경변수) | 20 | **사례 1·2·3·4·5·7** 직접 매칭 |
| Python 글로벌 (timeout/pickle/SQL injection) | 10 | TalkUp backend의 보조 스크립트에 부분 적용 |
| 한국 IT 컨벤션 (camelCase/UTF-8/KST/₩/RFC5987/OAuth) | 7 | **사례 6** + 추가 한국 시장 패턴 |
| 금감원 AI 가이드라인 (audit-log/PII/model 추적) | 5 | 핀테크 통합 시 직접 매칭 |
| PCI DSS (카드번호/CVV/TLS/멱등키) | 8 | 결제 통합 라인업 매칭 |
| **합계** | **50** | |

> 한국 IT 컨벤션 + 금감원 AI 가이드라인 + PCI DSS 룰 **20개** 는 글로벌 가드레일 도구(Codacy/Greptile/Semgrep 등)가 흉내내기 어려운 영역입니다.

## 4. 정량 효과 (추정)

> 다음 수치는 본 프로젝트와 비슷한 규모 / AI 의존도의 한국 IT 모노레포에 50개 룰을 적용했을 때의 **추정 효과**입니다. 실제 수치는 코드베이스마다 다릅니다.

- **AI 생성 코드의 위반 평균**: AI 보조 비율 30~50% 코드베이스에서 50개 룰 기준 **파일당 0.4~1.2건** 위반 (베타 룰셋 기준).
- **수정 평균 시간**: 룰별 message + 위반 코드 위치 명시 → AI 에이전트가 자체 수정 가능. 사람 개입 평균 **30초 미만/건**.
- **CI 차단 효과**: pre-commit 훅으로 **저장소 진입 단계에서 차단** → 사후 PR 코멘트보다 빠른 피드백 루프.

## 5. 운영 노트

### 베타 한계

본 룰셋은 모두 **heuristic 기반**입니다 (tree-sitter syntactic 분석, type-aware 분석은 v1.5에 추가):
- false positive 가능성: **약 3~8%** (룰별 차이). 룰 ID로 비활성화 가능.
- false negative: 변수가 다른 모듈에서 import된 경우 일부 패턴 미검출.
- **금감원 § / PCI DSS § 번호 매핑**: 현재 메시지에 "FSC AI guideline" 일반 표현. 가이드라인 § 번호는 Phase 1b 후반에 매핑 추가 예정.

### 검증 (examples/talkup-mirror/src/talkup-cases.ts)

위 7개 사례를 익명화 샘플로 mirror에 추가하고 `aicq check` 실행:

| 사례 | 룰 | 검출 |
|------|----|------|
| 1 LLM 직접 인스턴스화 | `no-direct-openai` | ✅ |
| 2 console.log | `no-console-log` | ✅ |
| 3 id 네임스페이스 덮어쓰기 | `no-id-overwrite` | ⚠️ 변형 패턴, 베타 정밀도 한계 |
| 4 rateLimit 누락 | `route-needs-rate-limit` | ✅ |
| 5 async wrapper 누락 | `controller-needs-async-wrapper` | ✅ |
| 6 FK onDelete 누락 | `fk-needs-on-delete` | ⚠️ `camelcase-migration-column` 부수 검출, 룰 정밀도 v1.5에서 보강 |
| 7 API 응답 형식 | `api-response-shape` | ✅ |

5/7 즉시 검출. 변형 패턴 2건은 v1.5 (type-aware) 도입 시 정밀도 향상 예정.

### 권장 도입 순서

1. **AI 에이전트 룰 동기화 먼저**: `aicq sync-ai-rules`로 `.cursorrules` / `CLAUDE.md`에 50개 룰을 주입. AI가 코드 생성 단계에서 더 정확.
2. **MCP 서버 등록**: Claude Code/Cursor MCP로 prompt 시점 차단 (룰 위반 코드 생성 시도 시 즉시 알림).
3. **pre-commit hook**: husky/lefthook으로 저장소 진입 차단.
4. **GitHub Action**: PR에 자동 코멘트로 인사이트 공유.

위 4단계는 [docs/pre-commit-setup.md](../pre-commit-setup.md), [docs/mcp-claude-code-setup.md](../mcp-claude-code-setup.md)에 단계별 가이드가 있습니다.

## 6. 다음 단계 (출처 추적기 + EU AI Act)

aicq는 가드레일 외에 **출처 추적기 모듈**(modules/provenance)도 함께 출시했습니다:
- `aicq provenance capture --reader claude-code` — Claude Code 세션을 자동 캡처 (E1)
- `aicq provenance report --format article-50-html --locale ko` — EU AI Act Article 50 한·영 리포트 (E3)
- `aicq provenance report --format article-50-pdf` — 감사용 PDF 산출물 (E3 PDF, puppeteer optional)
- `aicq provenance report --format ai-bom` — CycloneDX 1.6 AI-BOM

EU AI Act 시행(2026-08-02) 직전 출시되어, 한국 IT 회사가 컴플라이언스 요건과 코드 품질을 같은 도구로 처리할 수 있습니다.

## 7. 참고 링크

- 룰 50개 카탈로그: [`apps/docs`](../../apps/docs)
- pre-commit 셋업: [`docs/pre-commit-setup.md`](../pre-commit-setup.md)
- MCP 등록: [`docs/mcp-claude-code-setup.md`](../mcp-claude-code-setup.md)
- PDF 렌더링: [`docs/pdf-rendering.md`](../pdf-rendering.md)
- 영어 버전: [`talkup-30k.en.md`](talkup-30k.en.md)
