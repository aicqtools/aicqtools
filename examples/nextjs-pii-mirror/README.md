# nextjs-pii-mirror — Next.js App Router + 금감원 PII 룰 시연

> Next.js 14+ App Router 구조에서 aicqtools가 잡아내는 금감원 AI 가이드라인 / 한국 IT 컨벤션 위반 패턴을 의도적으로 심어둔 미러 예제.

## 🇰🇷 한국어

### 무엇을 시연하는가 — 총 9건 적중 (2026-05-21 측정)

`src/app/api/ai-chat/route.ts` — **위반 6건**:

| # | 룰 ID | 심각도 | 라인 | 위반 위치 |
|---|------|-------|----|---------|
| 1 | `no-direct-openai` | error | 16 | `const openai = new OpenAI({...})` — LLM 클라이언트 싱글톤 정책 위반 |
| 2 | `no-process-env-leak` | warning | 16 | `process.env.OPENAI_API_KEY` 직접 접근 — `config/env.ts`를 통해 읽어야 함 |
| 3 | `no-plain-card-number` | error | 21 | `cardNumber: string` 필드 정의 — PCI DSS § 3.5.1 평문 저장 금지 |
| 4 | `audit-log-ai-decision` | error | 26 | AI 호출 후 감사 로그 부재 — 금감원 AI 가이드라인 |
| 5 | `mask-card-number` | error | 35 | `body.cardNumber`를 마스킹 없이 prompt에 포함 — PCI DSS § 3.4.1 |
| 6 | `no-inline-date` | warning | 42 | `new Date().toISOString()` — dateHelper 사용 필요 (KST 명시 등) |

`src/scripts/seed-ai-prompt.ts` — **위반 3건** (`mask-pii-in-ai-prompt`는 리터럴 PII 패턴 매칭이라 인라인 시드/픽스처에서 적중):

| # | 룰 ID | 심각도 | 라인 | 위반 위치 |
|---|------|-------|----|---------|
| 7 | `no-direct-openai` | error | 12 | `new OpenAI()` |
| 8 | `mask-pii-in-ai-prompt` | error | 15 | 리터럴 RRN `900101-1234567`을 prompt content에 포함 |
| 9 | `mask-pii-in-ai-prompt` | error | 21 | 리터럴 카드번호 `4111 1111 1111 1111`을 prompt content에 포함 |

`src/app/api/ai-chat/route-good.ts` — **위반 0** baseline. PII는 vault token 참조(`residentNumberRef`, `cardTokenRef_encrypted`)로 대체하고, 사내 싱글톤 LLM client + dayjs `Asia/Seoul` + `auditAiDecision()`를 사용.

### 룰 한계 (정직한 노트)

- `mask-pii-in-ai-prompt`는 리터럴 PII 패턴만 매칭합니다(`\d{6}-\d{7}`, `\d{15,16}`). 변수 보간을 통해 PII가 흘러가는 케이스는 false negative이며, 정상 패턴(`route-good.ts`)의 토큰 참조 방식이 사실상의 fix입니다. 변수 흐름 추적은 v1.1 후속 검토.
- `audit-log-ai-decision`은 AI 호출 직후 동일 함수 스코프에서 `auditAi*` 호출이 보이는지로 판단합니다. 다른 모듈로 위임된 로깅은 false negative 가능.

### 직접 실행

```bash
# aicqtools 모노레포 루트에서 (한 번)
pnpm install && pnpm -w build

# 이 예제 디렉토리에서
cd examples/nextjs-pii-mirror
node ../../packages/cli/dist/bin.js check --locale ko --no-cache
```

기대 출력:

```
파일 3개 검사, 위반 9개, ~80ms 소요
  route.ts 6건 + seed-ai-prompt.ts 3건, route-good.ts 0건
exit code 1
```

### 왜 이 예제인가

한국 핀테크/SaaS가 EU AI Act Article 50 + 금감원 AI 가이드라인을 동시에 충족하려면 **AI 호출 전 PII 마스킹 + 모델 버전 추적 + 감사 로그**가 비협상입니다. Next.js App Router는 한국 신규 프로젝트 점유율이 가장 높은 프레임워크이고, `app/api/<route>/route.ts` 패턴이 AI 호출의 단일 진입점이 되는 경우가 흔합니다. 이 예제는 그 단일 진입점이 "동작은 하지만 컴플라이언스를 통과 못 하는" 흔한 형태를 1:1 시연합니다.

---

## 🇬🇧 English

### What this mirrors — 9 hits total (measured 2026-05-21)

`src/app/api/ai-chat/route.ts` ships **6 violations**:

| # | Rule ID | Severity | Line | Where |
|---|---------|----------|------|-------|
| 1 | `no-direct-openai` | error | 16 | `new OpenAI({...})` — violates the singleton-only LLM client policy |
| 2 | `no-process-env-leak` | warning | 16 | Direct `process.env.OPENAI_API_KEY` — must go through `config/env.ts` |
| 3 | `no-plain-card-number` | error | 21 | `cardNumber: string` field definition — PCI DSS § 3.5.1 |
| 4 | `audit-log-ai-decision` | error | 26 | No audit log around the AI call |
| 5 | `mask-card-number` | error | 35 | `body.cardNumber` substituted into the prompt unmasked — PCI DSS § 3.4.1 |
| 6 | `no-inline-date` | warning | 42 | Inline `new Date()` — use the timezone-aware dateHelper |

`src/scripts/seed-ai-prompt.ts` ships **3 violations** (`mask-pii-in-ai-prompt` matches literal PII patterns, so inline test seeds trip it):

| # | Rule ID | Severity | Line | Where |
|---|---------|----------|------|-------|
| 7 | `no-direct-openai` | error | 12 | `new OpenAI()` |
| 8 | `mask-pii-in-ai-prompt` | error | 15 | Literal RRN `900101-1234567` embedded in the prompt content |
| 9 | `mask-pii-in-ai-prompt` | error | 21 | Literal card number `4111 1111 1111 1111` embedded in the prompt content |

`src/app/api/ai-chat/route-good.ts` is the **zero-violation** baseline. PII never crosses the server boundary — only vault token references (`residentNumberRef`, `cardTokenRef_encrypted`) do. Plus internal singleton LLM client, dayjs `Asia/Seoul`, and `auditAiDecision()`.

### Rule limitations (honest note)

- `mask-pii-in-ai-prompt` matches literal PII patterns (`\d{6}-\d{7}`, `\d{15,16}`). Cases where PII flows through variable interpolation are false negatives; the fix in practice is the token-reference pattern in `route-good.ts`. Variable-flow tracking is on the v1.1 follow-up list.
- `audit-log-ai-decision` checks for an `auditAi*` call in the same function scope as the AI call. Logging delegated to another module may be a false negative.

### Run it

```bash
# From the aicqtools monorepo root (once)
pnpm install && pnpm -w build

# In this directory
cd examples/nextjs-pii-mirror
node ../../packages/cli/dist/bin.js check --locale en --no-cache
```

Expected output:

```
3 files scanned, 9 violations, ~80ms
  route.ts 6 + seed-ai-prompt.ts 3, route-good.ts 0
exit code 1
```

### Why this example

To clear both EU AI Act Article 50 and the Korean FSC AI guidelines, **PII masking before the LLM call + model-version tracking + an audit log** are non-negotiable for Korean fintech / SaaS. Next.js App Router has the highest adoption among new Korean projects, and `app/api/<route>/route.ts` is frequently the single entry point for AI calls. This example shows that single entry point in its most common "works but won't pass compliance" form, side by side with its fixed twin.
