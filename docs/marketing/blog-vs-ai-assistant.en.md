# Can AI Code Assistants Enforce Their Own Rules? — Cost, Accuracy, and Determinism Compared

> A quantitative look at "just tell the AI assistant to follow the rules" for teams using Claude Code, Cursor, Copilot, and similar tools. Where does *token cost* end and *real cost* begin? This post separates the two — using a Korean fintech monorepo's one-year data as the baseline.

---

## TL;DR

- **After adopting AI code assistants, company-policy violations recur weekly in PR review** — senior-engineer review time is the real cost.
- We compare 4 ways to "enforce rules through the AI itself" (`.cursorrules` / `CLAUDE.md` injection / per-PR call / full-repo sweep / SaaS bot) across tokens, cost, accuracy, determinism, and merge-gate.
- **Token cost itself is $5–$240 per month — manageable.** The real cost is the 25-hour rule-catalog write-up + no determinism + no CI hard gate + no Korean-domain rule pack.
- aicqtools brings these five hidden costs to zero with tree-sitter AST determinism + 12 Korean-domain rules + MIT OSS.

---

## "Can't the AI just check its own output?" — the question we keep getting

We hear this in customer conversations and on community threads:

> "If I just put the rules in `CLAUDE.md`, the assistant won't break them, right? Why do I need a separate tool like aicqtools?"

Fair question. The only honest answer is to measure it. Using a Korean fintech monorepo's one-year data (~200 PRs/month, 4 seniors + 6 juniors), we compared four approaches.

---

## 4 ways to enforce rules through the AI itself

### (A) Inject all 50 rules into `CLAUDE.md` / `.cursorrules`

The most intuitive route. Write out the full bodies (message + rationale + violating example + passing example) of 7 Korean IT conventions + 5 FSC AI guidelines + 8 PCI DSS + 30 global = **50 rules** in markdown, drop into the project root. The AI code assistant loads it as system prompt every session.

**What the user has to do:**
- Write 50 rules from scratch — ~30 minutes each (message, rationale, two code examples) × 50 = **~25 hours of upfront work**
- Keep the markdown in sync when rules evolve

### (B) Ask the AI to check each PR diff

After opening a PR, paste the diff into the assistant chat and ask "does this violate any of [list of 50 rules]?". Manual or semi-manual — a human triggers it every time.

### (C) Ask the AI to scan the whole repo (monthly regression)

205,069 LOC ≈ 2.5M tokens — too large for a single context. Split into 50 chunks of ~50K, send each with the 50-rule context, collect the violation list.

### (D) PR-review SaaS bot (CodeRabbit, Codacy AI, etc.)

A hosted bot reviews PRs automatically using its own LLM. You don't write rules, but **the bot doesn't know Korean-domain rules either**.

---

## Comparison table (10-person team, 200 PRs / month)

| Approach | Tokens/month | Cost/month (Sonnet 4.6) | Deterministic | Accuracy | Merge gate |
|---|---|---|---|---|---|
| **(A)** `CLAUDE.md` injection | ~6M (cache hit) | $2 – $18 | ❌ | 70–85% | ❌ |
| **(B)** Per-PR AI call | ~5.4M | $5 – $21 | ❌ | 70–85% | △ |
| **(C)** Full-repo AI sweep (once) | ~3.5M | **$8.55 (Sonnet) / $42 (Opus)** /run | ❌ | 60–75% (more FP/FN) | ❌ |
| **(D)** CodeRabbit Pro | (external billing) | **$24/dev × 10 = $240/month** | ❌ | 75–85% | △ |
| **aicqtools** | **0** | **$0** (OSS, runs locally) | ✅ | **100%** (tree-sitter AST) | ✅ (CI hard gate) |

### Token math (auditable numbers)

- Rule catalog: 50 × ~400 tokens ≈ **20K tokens** (30K with Korean i18n bodies)
- Diff average ≈ 3K tokens
- (A): 20K cache hit per turn, ~100 turns/day × 30 days ≈ 6M cached input tokens
- (B): (20K cache + 3K diff + 2K output) × 200 PRs ≈ 5.4M
- (C): 50 chunks × 50K = 2.5M input + 1M cache_read + 50K output

> Anthropic pricing (as of 2026-05, Claude Sonnet 4.6): input $3/MTok, output $15/MTok, cache write 1×, cache read 0.1×.

---

## The real cost isn't tokens

Token cost looks bearable at $5–$240/month, but that isn't where the bill actually shows up.

### 1. 25 hours of upfront rule-catalog writing

Someone has to write 12 Korean IT conventions + 5 FSC AI guidelines + 8 PCI DSS rules with messages, rationales, violating and passing examples — 30 minutes per rule × 50 = 25 hours. aicqtools ships these (with 97.8% native Korean i18n) out of the box.

### 2. No determinism → regressions slip back in

You can pin "always specify KST" to `CLAUDE.md` and still see `new Date()` ~30% of the time. Reviewing the same PR twice can yield different results. *Non-determinism* is the nature of the approach — you can't put a hard gate on a probabilistic check in CI.

### 3. Verification is a separate cost

Approach (A) alone isn't enough; you end up running (B) and (C) on top. The "tell the AI the rules" cost gets stacked with the "check the AI followed them" cost.

### 4. No CI hard gate

The AI can *flag*, but it can't *block* a merge. If the reviewer dismisses the comment, the violation lands on `main`. aicqtools exits with non-zero in GitHub Actions when a violation is found — merge is blocked automatically.

### 5. No Korean-domain rule pack

Trained on global data, the AI is weaker on these patterns:
- RFC 5987 Korean filename `Content-Disposition`
- Capacitor + Kakao/Naver OAuth WebView anti-pattern
- Korean FSC AI guidelines (PII masking, model-version tracking, AI-decision audit logging)
- Explicit KST timezone
- Sequelize migration column camelCase

Global tool comparison (based on publicly available info as of 2026-05): CodeRabbit · Codacy · SonarQube · ESLint AI all ship **0 Korean IT rules, 0 FSC guideline rules, no Korean UI**.

---

## The bottom line

Token-cost savings is a side effect. The real value of aicqtools is:

> **Driving (senior-engineer PR review time + 25h rule-catalog write-up + slipped-regression risk) to zero — costs that an AI-only setup keeps re-billing every month.**

A 70–85% accuracy rule check is a guardrail that leaks 15–30 out of every 100 violations. When the senior catches them again at review time, senior hours become direct cost.

aicqtools brings:
- **tree-sitter AST determinism** — same input → same output, 100% pass/fail
- **50 built-in rules** — 7 Korean IT + 5 FSC + 8 PCI DSS + 30 global; zero rule-writing upfront cost
- **CI hard gate** — GitHub Actions blocks the merge on any violation
- **MIT OSS** — permanently free. Any paid options (cloud dashboard etc.) will be decided at v1.5

---

## Getting started

```bash
npm install --save-dev @aicqtools/cli
npx aicq init --stack next     # or nest | capacitor | generic
npx aicq check --locale en     # first scan — 10K LOC monorepo ~3s
```

You can have first results within 30 minutes.

- **GitHub**: https://github.com/aicqtools/aicqtools — MIT, v1.0.0-beta.2 (2026-05-22)
- **npm**: `@aicqtools/cli` (latest tag, or `@beta`)
- **CHANGELOG**: in the repo root
- **AI assistant integration** (MCP-native): `aicq mcp` registers as an MCP server — rule context is injected *before* code generation

Feedback, issues, and PRs welcome. Real-world Korean-team rule curation is the most valuable contribution.
