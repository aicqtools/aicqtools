# 케이스 스터디 — Nest.js `typescript-starter` 외부 dogfood

> aicq 1.0.0-beta.1을 Nest.js 공식 `nestjs/typescript-starter`(2026-05-21 기준 main 브랜치, depth=1 clone)에 적용한 결과. **G1 게이트** (외부 dogfood ≥ 2)의 +1 충족.

## 1. 대상 프로파일

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/nestjs/typescript-starter |
| 소스 파일 | 5 (`app.controller.ts`, `app.controller.spec.ts`, `app.module.ts`, `app.service.ts`, `main.ts`) |
| 테스트 파일 | 1 (`app.e2e-spec.ts`) |
| 총 스캔 대상 | **7 files** |

minimal scaffolding이라 코드량 적음. 하지만 NestJS의 표준 DI 패턴(@Controller / @Module / @Injectable)을 모두 포함해 *룰 휴리스틱이 NestJS DI를 어떻게 처리하는지* 정확히 측정 가능.

## 2. 실행

```bash
git clone --depth=1 https://github.com/nestjs/typescript-starter.git
cd typescript-starter
npx --yes -p @aicqtools/cli@1.0.0-beta.1 aicq check --locale en
```

영구 설치 없이 1회성 실행. config 없음(default 룰셋).

## 3. 결과 — **7 files / 2 violations / 157ms**

### 3.1 `no-magic-number` × 1 (info) — true positive

**위치**: `src/main.ts:6:20`

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);  // ⚠️ Magic number
}
```

**판정**: true positive. `3000`은 default port의 흔한 표기이지만 룰 권장대로 `const DEFAULT_PORT = Number(process.env.PORT ?? 3000)` 추출이 정확함. severity = info라 권고 수준.

### 3.2 `route-needs-rate-limit` × 1 (error) — **false positive**

**위치**: `src/app.controller.spec.ts:17:29`

```ts
const appController = app.get(AppController);  // 🟥 라우트 등록으로 오인
```

**판정**: false positive. 룰의 `.get()` 휴리스틱이 NestJS `TestingModule.get(token)` DI lookup을 Express/Hono식 라우트 등록(`app.get('/path', handler)`)으로 잘못 매치.

**회피**: `aicq.config.yaml`의 `overrides:`에 `paths: ['**/*.spec.ts']` → `rules: { route-needs-rate-limit: off }` 추가하면 즉시 해소.

## 4. 비협상 룰 검출 여부

| 룰 | 발화 여부 | 비고 |
|---|---|---|
| `mask-pii-in-ai-prompt` | × | 코드에 AI/PII 없음 |
| `no-direct-openai` / `no-direct-anthropic` | × | LLM 호출 없음 |
| `controller-needs-async-wrapper` | × | starter의 단순 controller에 wrapper 필요 안 함 |
| `route-needs-auth` | × | starter라 auth 미구현, 룰 미발화 OK |
| `explicit-kst-timezone` | × | 시간대 코드 없음 |

비협상 룰 0건 발화 = 잘못된 차단 없음 ✅

## 5. beta.2 해소 완료 — `route-needs-rate-limit` spec 파일 default skip

본 dogfood에서 surfacing된 FP는 beta.2 cycle에서 **이미 해소**됐습니다. `no-console-log` / `no-empty-catch` / `no-magic-number`가 알파.13+의 빌트인 자동 스킵을 갖던 것과 동일하게, **`route-needs-rate-limit`에도 `SKIP_FILE_RE` 가드가 추가**되어 `.spec.ts` / `.test.ts` / `__tests__/` / `e2e-spec` 경로에서 발화하지 않습니다 (`skipBuiltinSkips: true` 또는 `overrides`로 opt-out 가능).

회귀 가드: [`modules/guardrail/src/__tests__/route-needs-rate-limit-skips.test.ts`](../../modules/guardrail/src/__tests__/route-needs-rate-limit-skips.test.ts) (6 tests). additive default 확장 — framework 동결 준수.

## 6. 결론

| 게이트 | 진척 |
|---|---|
| G1 (외부 dogfood ≥ 2) | **2/2** ✓ — TalkUp + Nest.js typescript-starter |
| FP 패턴 | 1 catalog (spec 파일 `route-needs-rate-limit`) → beta.2 fix 후보 |
| 잘못된 차단 | 0건 |

Nest.js DI 패턴이 비협상 룰을 잘못 차단하지 않음 + 1건의 minor FP는 베타.2 additive fix로 해소 가능. **외부 dogfood 추가 후보로서 합격.**

---

영문판: [nestjs-starter.en.md](nestjs-starter.en.md)
