# Case study — Nest.js `typescript-starter` external dogfood

> Result of applying aicq 1.0.0-beta.1 to the official `nestjs/typescript-starter` (main branch, depth=1 clone, 2026-05-21). Closes the **G1 gate** (≥ 2 external dogfood targets).

## 1. Target profile

| Field | Value |
|---|---|
| Repository | https://github.com/nestjs/typescript-starter |
| Source files | 5 (`app.controller.ts`, `app.controller.spec.ts`, `app.module.ts`, `app.service.ts`, `main.ts`) |
| Test files | 1 (`app.e2e-spec.ts`) |
| Total scanned | **7 files** |

Minimal scaffolding — small total LoC, but covers the standard NestJS DI surface (`@Controller`, `@Module`, `@Injectable`), which is enough to measure exactly *how the rule heuristics treat NestJS DI patterns*.

## 2. Run

```bash
git clone --depth=1 https://github.com/nestjs/typescript-starter.git
cd typescript-starter
npx --yes -p @aicqtools/cli@1.0.0-beta.1 aicq check --locale en
```

Ephemeral execution — no persistent install, no config (default ruleset).

## 3. Result — **7 files / 2 violations / 157 ms**

### 3.1 `no-magic-number` × 1 (info) — true positive

**Location**: `src/main.ts:6:20`

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);  // ⚠️ Magic number
}
```

**Verdict**: true positive. `3000` is the common default-port literal; the rule correctly suggests `const DEFAULT_PORT = Number(process.env.PORT ?? 3000)`. Severity = info, advisory only.

### 3.2 `route-needs-rate-limit` × 1 (error) — **false positive**

**Location**: `src/app.controller.spec.ts:17:29`

```ts
const appController = app.get(AppController);  // 🟥 misclassified as route registration
```

**Verdict**: false positive. The rule's `.get()` heuristic confuses NestJS `TestingModule.get(token)` (DI lookup) with Express/Hono-style route registration (`app.get('/path', handler)`).

**Workaround**: add `overrides:` with `paths: ['**/*.spec.ts']` → `rules: { route-needs-rate-limit: off }` in `aicq.config.yaml`.

## 4. Non-negotiable rule firing

| Rule | Fired | Note |
|---|---|---|
| `mask-pii-in-ai-prompt` | × | No AI/PII code in starter |
| `no-direct-openai` / `no-direct-anthropic` | × | No LLM calls |
| `controller-needs-async-wrapper` | × | Simple controller, wrapper unnecessary |
| `route-needs-auth` | × | Starter has no auth — rule correctly stays silent |
| `explicit-kst-timezone` | × | No time-zone code |

Zero non-negotiable rules misfired ✅

## 5. Beta.2 follow-up — default-skip applied for `route-needs-rate-limit`

The FP surfaced by this dogfood has already been **resolved in the beta.2 cycle**. Mirroring how `no-console-log` / `no-empty-catch` / `no-magic-number` got the alpha.13+ built-in skip, **`route-needs-rate-limit` now ships the same `SKIP_FILE_RE` guard**: it stays silent for `.spec.ts` / `.test.ts` / `__tests__/` / `e2e-spec` paths (users who really register routes from a spec file can opt out via `skipBuiltinSkips: true` or `overrides`).

Regression guard: [`modules/guardrail/src/__tests__/route-needs-rate-limit-skips.test.ts`](../../modules/guardrail/src/__tests__/route-needs-rate-limit-skips.test.ts) (6 tests). Additive default extension — framework-freeze compliant.

## 6. Conclusion

| Gate | Progress |
|---|---|
| G1 (external dogfood ≥ 2) | **2/2** ✓ — TalkUp + Nest.js typescript-starter |
| FP patterns surfaced | 1 (spec-file `route-needs-rate-limit`) → beta.2 fix candidate |
| Wrong blocks | 0 |

NestJS DI patterns don't trip non-negotiable rules + the single minor FP is fixable by an additive default-skip in beta.2. **Passes as the second external dogfood target.**

---

Korean version: [nestjs-starter.md](nestjs-starter.md)
