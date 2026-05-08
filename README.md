<div align="right">

[**한국어**](README.md) | [English](README.en.md)

</div>

# AICQ Tools — AI 코드 품질 플랫폼 *(작업명)*

> AI 바이브코딩으로 생성된 코드를 **결정론적**으로 검증하는 통합 코드 품질 플랫폼. 가드레일 엔진, 출처 추적기, 의존성 검증기를 단일 모노레포로 운영합니다.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status: Phase 1a alpha](https://img.shields.io/badge/status-Phase_1a_alpha-orange.svg)]()

> 통합 브랜드는 Phase 5(2026-Q4)에 결정합니다. 그전까지 임시 organization/scope 명 **`aicqtools`** 사용. 사용자 직면 인터페이스(`aicq` CLI 명령, `aicq.config.yaml`, `aicq/rules/`)는 그대로 유지합니다.

## ✨ 핵심 차별화

1. **결정론적 검증** — LLM 호출 없이 100% 통과/실패 판정 (Codacy/Greptile은 확률적)
2. **MCP 네이티브** — Claude Code/Cursor MCP 서버로 통합, AI가 코드를 만들기 **전** prompt 시점에 차단
3. **AI 에이전트 룰 자동 동기화** — `.cursorrules`/`CLAUDE.md`에 위반 컨텍스트 자동 주입
4. **하이브리드 룰 UX** — 간단=YAML, 복잡=JS/TS 함수
5. **한국 도메인 룰셋** — 금감원 AI 가이드라인·PCI DSS·한국 IT 컨벤션을 처음부터 번들 (글로벌 도구 미진입 영역)
6. **Repo당 과금** — Team Pro ₩29,000/repo·월 (Semgrep $35×N과 비교)

## 📦 모듈 / 패키지

| 모듈 | 상태 | 설명 |
|------|------|------|
| `modules/guardrail` | Phase 1a alpha | 결정론적 룰 엔진 (YAML + JS/TS 함수, 37개 빌트인) |
| `modules/provenance` | Phase 1a PoC | AI 코드 출처 추적기 (EU AI Act 대응) |
| `modules/supply-chain` | placeholder | 의존성 신뢰도 검증 (Phase 4) |

| 패키지 | 설명 |
|--------|------|
| `packages/core` | tree-sitter 파서·sqlite 캐시·리포터·설정·i18n (3개 모듈 공유) |
| `packages/rule-sdk` | 사용자 룰 작성 SDK (`defineRule()`) |
| `packages/cli` | 통합 CLI (`aicq check` / `provenance` / `mcp` / `sync-ai-rules` / `docs build`) |
| `packages/action` | GitHub Action (Composite, PR 자동 검증) |

## 🚀 빠른 시작

### 모노레포 자체 빌드

```bash
pnpm install
pnpm build
pnpm test
```

### 사용자 프로젝트에 통합

```bash
# 1. 사용자 프로젝트에서 (workspace 외부, npm publish 후)
pnpm add -D @aicqtools/cli

# 2. 검사 실행
npx aicq check --locale ko

# 3. AI 에이전트 룰 자동 동기화
npx aicq sync-ai-rules --locale ko
# → .cursorrules / CLAUDE.md에 37개 룰 주입

# 4. 룰 docs 생성
npx aicq docs build --out aicq-docs
```

## 🛠️ CI / pre-commit 통합

### GitHub Action (PR 자동 검사)

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
          locale: ko
```

자세한 옵션: [packages/action/README.md](packages/action/README.md)

### pre-commit (husky)

```bash
pnpm add -D husky
pnpm exec husky init
echo 'npx aicq check' > .husky/pre-commit
```

husky/lefthook 양쪽 가이드: [docs/pre-commit-setup.md](docs/pre-commit-setup.md)

### MCP 서버 (Claude Code / Cursor)

```bash
claude mcp add --transport stdio aicq -- node /path/to/aicqtools/packages/cli/dist/bin.js mcp
```

자세한 안내: [docs/mcp-claude-code-setup.md](docs/mcp-claude-code-setup.md)

## 📋 빌트인 룰셋 (37개)

- **TypeScript / JavaScript 글로벌 (20개)** — LLM 클라이언트 싱글톤, API 응답 형식, 라우트 미들웨어, 에러 처리, 환경변수 누설 방지 등
- **Python 글로벌 (10개)** — requests timeout, pickle 금지, f-string SQL 차단, mutable default argument 등
- **한국 IT 컨벤션 (7개)** — Sequelize migration camelCase, KST 타임존, 원화 포맷, RFC 5987 한글 파일명, Naver/Kakao OAuth WebView 패턴 등

전체 목록: `aicq docs build` 후 `aicq-docs/rules/ko/index.md` 참조.

## 🗺️ 로드맵

| Phase | 시기 | 핵심 |
|-------|------|------|
| **Phase 1a** | ~2026-08-01 | EU AI Act 시한 직전 v1.0 압축 출시 (37 룰 + MCP 알파 + 출처 추적기 PoC) |
| **Phase 1b** | ~2026-09-15 | 금감원/PCI 13개 추가 → 50 룰, 출처 추적기 알파 |
| **Phase 2** | ~2026-10-27 | v1.5 클라우드 SaaS 베타 (대시보드·PR 코멘트·Stripe) |
| **Phase 3** | 6~9개월차 | 통합 플랫폼 정식 출시 + IDE 확장 |

## 📜 라이선스

MIT — [LICENSE](LICENSE) 참조.

## 🤝 기여

`CONTRIBUTING.md` (예정). 버그 제보·룰 PR 환영합니다.
