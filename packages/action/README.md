# `@aicqtools/action` — AICQ Guardrail Check (GitHub Action)

AI 코드 가드레일 룰을 GitHub PR에 자동 적용하는 Composite Action. 결정론적 검증(LLM 호출 없음, 100% 통과/실패).

> Phase 1a PoC 수준 — Composite action으로 dogfooding. v1.0에서 Node.js Action + PR 자동 코멘트 + SARIF 업로드로 강화.

---

## 사용법 (한국어)

자기 저장소의 `.github/workflows/aicq-check.yml` 작성:

```yaml
name: AICQ check
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aicqtools/aicqtools/packages/action@main
        with:
          locale: ko
          format: text
```

### Inputs

| 이름 | 기본값 | 설명 |
|------|--------|------|
| `format` | `text` | 출력 포맷 (`text` / `json` / `sarif`) |
| `locale` | `en` | 메시지 언어 (`ko` / `en`) |
| `cwd` | `.` | 검사할 프로젝트 루트 |
| `fail-on-warning` | `false` | 경고만 있어도 실패 처리할지 |

### 동작

1. pnpm + Node 20 셋업
2. `pnpm install --frozen-lockfile`
3. `pnpm build` (모노레포 빌드)
4. `node packages/cli/dist/bin.js check ...` 실행
5. 위반 `error`가 하나라도 있으면 step 실패 → PR가 빨간불

---

## English

Composite GitHub Action that runs AICQ deterministic guardrail rules on every PR.

```yaml
- uses: aicqtools/aicqtools/packages/action@main
  with:
    locale: en
    format: text
```

| Input | Default | Description |
|-------|---------|-------------|
| `format` | `text` | Output format (`text` / `json` / `sarif`) |
| `locale` | `en` | Message locale (`ko` / `en`) |
| `cwd` | `.` | Project root to scan |
| `fail-on-warning` | `false` | Fail step on warnings too |

---

## Roadmap

- v1.0: Node.js Action (faster boot, bundled dist)
- v1.0: Auto PR comment via `actions/github-script`
- v1.0: SARIF upload (public repos free, private requires GHAS)
- v1.0: `actions/cache` for sqlite incremental cache
