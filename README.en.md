<div align="right">

[한국어](README.md) | [**English**](README.en.md)

</div>

# AICQ Tools — AI Code Quality Platform *(working name)*

> A unified code-quality platform that **deterministically** validates AI-generated code. Guardrail engine, provenance tracker, and supply-chain validator in a single monorepo.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status: Phase 1a alpha](https://img.shields.io/badge/status-Phase_1a_alpha-orange.svg)]()

> The unified brand will be decided in Phase 5 (2026-Q4). Until then, the temporary organization/scope name **`aicqtools`** is used. User-facing surfaces (`aicq` CLI command, `aicq.config.yaml`, `aicq/rules/`) remain stable.

## ✨ What sets us apart

1. **Deterministic checks** — 100% pass/fail without an LLM call (Codacy/Greptile are probabilistic)
2. **MCP-native** — Claude Code/Cursor MCP server integration; block AI **before** it generates the violating code, at prompt time
3. **AI-agent rule auto-sync** — auto-injects violation context into `.cursorrules`/`CLAUDE.md`
4. **Hybrid rule UX** — YAML for simple patterns, JS/TS functions for complex
5. **Korean domain ruleset bundled** — FSC AI guidelines, PCI DSS, Korean IT conventions out of the box (a gap global tools don't fill)
6. **Per-repo pricing** — Team Pro $19/repo/month (vs Semgrep $35×N seats)

## 📦 Modules / Packages

| Module | Status | Purpose |
|--------|--------|---------|
| `modules/guardrail` | Phase 1a alpha | Deterministic rule engine (YAML + JS/TS, 37 built-in rules) |
| `modules/provenance` | Phase 1a PoC | AI code provenance tracker (EU AI Act readiness) |
| `modules/supply-chain` | placeholder | Dependency trust validator (Phase 4) |

| Package | Purpose |
|---------|---------|
| `packages/core` | tree-sitter parser, sqlite cache, reporter, config, i18n (shared by all modules) |
| `packages/rule-sdk` | User rule authoring SDK (`defineRule()`) |
| `packages/cli` | Unified CLI (`aicq check` / `provenance` / `mcp` / `sync-ai-rules` / `docs build`) |
| `packages/action` | GitHub Action (Composite, automatic PR checks) |

## 🚀 Quick start

### Build the monorepo itself

```bash
pnpm install
pnpm build
pnpm test
```

### Use in your own project

```bash
# 1. In your project (after npm publish)
pnpm add -D @aicqtools/cli

# 2. Run a check
npx aicq check --locale en

# 3. Sync AI agent rules
npx aicq sync-ai-rules --locale en
# → injects 37 rules into .cursorrules / CLAUDE.md

# 4. Generate per-rule docs
npx aicq docs build --out aicq-docs
```

## 🛠️ CI / pre-commit integration

### GitHub Action (auto-check on PR)

`.github/workflows/aicq-check.yml`:

```yaml
name: AICQ check
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aicqtools/aicqtools/packages/action@main
        with:
          locale: en
```

Full options: [packages/action/README.md](packages/action/README.md)

### pre-commit (husky)

```bash
pnpm add -D husky
pnpm exec husky init
echo 'npx aicq check' > .husky/pre-commit
```

husky/lefthook walkthroughs: [docs/pre-commit-setup.md](docs/pre-commit-setup.md)

### MCP server (Claude Code / Cursor)

```bash
claude mcp add --transport stdio aicq -- node /path/to/aicqtools/packages/cli/dist/bin.js mcp
```

Full guide: [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md)

## 📋 Built-in ruleset (37 rules)

- **TypeScript / JavaScript global (20)** — LLM client singletons, API response shapes, route middleware, error handling, env-var leakage, etc.
- **Python global (10)** — `requests` timeout, no `pickle`, no SQL via f-string, no mutable default args, etc.
- **Korean IT conventions (7)** — camelCase Sequelize migrations, explicit KST timezone, won-amount formatting, RFC 5987 Korean filenames, Naver/Kakao OAuth WebView patterns, etc.

Full list: run `aicq docs build` and open `aicq-docs/rules/en/index.md`.

## 🗺️ Roadmap

| Phase | Target | Highlights |
|-------|--------|------------|
| **Phase 1a** | ~2026-08-01 | v1.0 compressed launch right before EU AI Act effective date (37 rules + MCP alpha + provenance PoC) |
| **Phase 1b** | ~2026-09-15 | +13 FSC/PCI rules → 50 total, provenance tracker alpha |
| **Phase 2** | ~2026-10-27 | v1.5 cloud SaaS beta (dashboard, PR comments, Stripe) |
| **Phase 3** | months 6–9 | Unified platform GA + IDE extension |

## 📜 License

MIT — see [LICENSE](LICENSE).

## 🤝 Contributing

`CONTRIBUTING.md` is forthcoming. Bug reports and rule PRs welcome.
