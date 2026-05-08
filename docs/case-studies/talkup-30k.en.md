# Case study — applying aicq to a Korean production codebase

> Applying the 50-rule aicq guardrail to a Korean commercial monorepo (**205,069 LOC**, 1,379 source files). All code snippets are **anonymized and generalized**; the original codebase has not been published.

## 1. Codebase profile

| Module | Files | LOC |
|--------|-------|-----|
| backend (Node.js + TypeScript) | 410 | **91,581** |
| frontend (React/Vue + TS/TSX) | 787 | **82,263** |
| frontend_admin (admin panel) | 182 | **31,225** |
| **Total** | **1,379** | **205,069** |

> The "30k LOC" marketing line refers to the admin panel alone. The full integrated codebase is roughly **6× that**, around 200 kLOC.

## 2. Seven recurring AI vibe-coding patterns

This codebase was substantially co-authored with Claude Code / Cursor. Over time, the AI-generated diffs accumulated repeated violations of **project-specific conventions** that ESLint and Snyk could not flag. The first aicq ruleset was bootstrapped directly from these seven patterns.

### Case 1 — Direct LLM client instantiation

**Issue**: AI keeps writing `new OpenAI(...)` per route. The internal standard is the `llmClient` singleton (rate limiting, logging, error policy unified).

```ts
// ❌ frequently produced by AI
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ in-house standard
import { llmClient } from '@/lib/llmClient';
const reply = await llmClient.chat({ model: 'gpt-4', messages });
```

**aicq rules**: `no-direct-openai`, `no-direct-anthropic` (severity: error)

### Case 2 — `console.log` lingering in production builds

**Issue**: AI inserts `console.log(...)` for debugging. PII frequently leaked to stdout.

```ts
// ❌
console.log('user', user, 'token', token);

// ✅
logger.debug('user.token.minted', { userId: user.id });
```

**aicq rule**: `no-console-log` (severity: warning)

### Case 3 — ID namespace overwrites

**Issue**: When AI tries to expose a public ID instead of an internal one, it often spreads the model and re-assigns the same `id` key, losing data.

```ts
// ❌
const out = { ...user, id: user.publicId };  // user.id internal value clobbered

// ✅
const { id: _internalId, ...rest } = user;
const out = { ...rest, id: user.publicId };
```

**aicq rule**: `no-id-overwrite` (severity: error)

### Case 4 — Missing `rateLimit` middleware on new routes

**Issue**: AI omits the middleware chain. The team policy enforces `rateLimit` on every external route.

```ts
// ❌
router.post('/api/feedback', async (req, res) => { ... });

// ✅
router.post('/api/feedback', rateLimit(60), asyncWrapper, async (req, res) => { ... });
```

**aicq rules**: `route-needs-rate-limit`, `route-needs-auth` (severity: error)

### Case 5 — Async handlers without an error wrapper

**Issue**: AI writes `async` handlers but forgets `asyncWrapper` (or `express-async-errors`), causing unhandled rejections to crash the process.

```ts
// ❌
router.post('/foo', async (req, res) => { ... });

// ✅
router.post('/foo', asyncWrapper(async (req, res) => { ... }));
```

**aicq rule**: `controller-needs-async-wrapper` (severity: error)

### Case 6 — Foreign key without `onDelete` policy

**Issue**: AI declares the FK in migrations but skips `onDelete` / `onUpdate`. Internal policy requires explicit `cascade` / `restrict` / `set null`.

```ts
// ❌
references: { model: 'users', key: 'id' }

// ✅
references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE'
```

**aicq rule**: `fk-needs-on-delete` (severity: error)

### Case 7 — Inconsistent API response shape

**Issue**: AI invents a slightly different envelope per route (`{ data }`, `{ result }`, `{ payload }`). The internal standard is `{ success, data, message }`.

```ts
// ❌
res.json({ result: items });

// ✅
res.json({ success: true, data: items, message: null });
```

**aicq rule**: `api-response-shape` (severity: error)

## 3. Ruleset mapping (50 rules)

aicq v1.0-alpha.1 generalizes the seven patterns above and adds Korean-domain-specific rules.

| Category | Rules | TalkUp coverage |
|----------|-------|-----------------|
| TS global (LLM, routes, errors, env vars) | 20 | direct match for **cases 1, 2, 3, 4, 5, 7** |
| Python global (timeout, pickle, SQL injection) | 10 | applies to backend support scripts |
| Korean IT conventions (camelCase / UTF-8 / KST / ₩ / RFC 5987 / OAuth) | 7 | covers **case 6** and additional domain patterns |
| FSC AI guideline (audit log / PII / model tracking) | 5 | matches when integrating with fintech compliance |
| PCI DSS (card number / CVV / TLS / idempotency) | 8 | matches the payment integration line |
| **Total** | **50** | |

> The 20 Korean-domain rules (Korean IT conventions + FSC AI + PCI DSS) are the differentiator that global guardrail tools (Codacy / Greptile / Semgrep, etc.) cannot easily replicate.

## 4. Estimated impact

> The numbers below are **estimates** for codebases of comparable size and AI-authoring ratio.

- **Average AI-introduced violations**: 0.4–1.2 per file at 30–50 % AI-authoring ratio (beta ruleset).
- **Median fix time**: under **30 seconds per finding** when an AI agent receives the rule message + violation site.
- **CI gate effect**: pre-commit hook stops violations *before* the repository sees them — faster than post-PR comment loops.

## 5. Operational notes

### Beta limitations

All rules are **heuristic** — tree-sitter syntactic analysis only. Type-aware analysis lands in v1.5.
- False positives: roughly **3–8 %** depending on rule. Disable per-rule via `aicq.config.yaml`.
- False negatives: identifiers imported from unfamiliar modules may not match.
- **FSC § / PCI DSS § references**: messages currently use generic phrasing ("FSC AI guideline"). Per-clause § numbers ship in late Phase 1b.

### Verification (examples/talkup-mirror/src/talkup-cases.ts)

The seven cases above are codified as anonymized samples in the mirror. Running `aicq check`:

| Case | Rule | Detected |
|------|------|----------|
| 1 Direct LLM instantiation | `no-direct-openai` | ✅ |
| 2 console.log | `no-console-log` | ✅ |
| 3 id namespace overwrite | `no-id-overwrite` | ⚠️ Variant pattern — beta precision limit |
| 4 Missing rateLimit | `route-needs-rate-limit` | ✅ |
| 5 Missing async wrapper | `controller-needs-async-wrapper` | ✅ |
| 6 FK without onDelete | `fk-needs-on-delete` | ⚠️ Side-detected as `camelcase-migration-column`; precision improves in v1.5 |
| 7 API response shape | `api-response-shape` | ✅ |

5 of 7 cases are matched on first pass. The two variant patterns will benefit from type-aware analysis in v1.5.

### Recommended rollout order

1. **Sync agent rules first**: `aicq sync-ai-rules` injects all 50 rules into `.cursorrules` / `CLAUDE.md` so the AI is more likely to comply at generation time.
2. **Register the MCP server**: prompt-time blocking via Claude Code / Cursor MCP.
3. **pre-commit hook**: husky / lefthook to gate the repository.
4. **GitHub Action**: PR comment for visibility.

Step-by-step guides: [`docs/pre-commit-setup.md`](../pre-commit-setup.md), [`docs/mcp-claude-code-setup.md`](../mcp-claude-code-setup.md).

## 6. Next steps (provenance + EU AI Act)

aicq also ships a **provenance tracker module** (modules/provenance):
- `aicq provenance capture --reader claude-code` — automatic Claude Code session capture (E1)
- `aicq provenance report --format article-50-html --locale en` — EU AI Act Article 50 bilingual report (E3)
- `aicq provenance report --format article-50-pdf` — auditor-friendly PDF (E3 PDF, puppeteer optional)
- `aicq provenance report --format ai-bom` — CycloneDX 1.6 AI-BOM

Released ahead of EU AI Act enforcement (2026-08-02), letting Korean IT teams handle code quality and compliance with the same toolchain.

## 7. Links

- Rule catalog (50): [`apps/docs`](../../apps/docs)
- pre-commit setup: [`docs/pre-commit-setup.md`](../pre-commit-setup.md)
- MCP registration: [`docs/mcp-claude-code-setup.md`](../mcp-claude-code-setup.md)
- PDF rendering: [`docs/pdf-rendering.md`](../pdf-rendering.md)
- Korean version: [`talkup-30k.md`](talkup-30k.md)
