<div align="right">

[**한국어**](README.md) | [English](README.en.md)

</div>

# @aicqtools/cli

> AI 코드 품질 도구 `aicq`의 통합 CLI.
> `check` · `sync-ai-rules` · `mcp` · `provenance` · `docs build`.

[![npm](https://img.shields.io/npm/v/@aicqtools/cli/beta.svg)](https://www.npmjs.com/package/@aicqtools/cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/aicqtools/aicqtools/blob/HEAD/LICENSE)

aicqtools 모노레포의 사용자 입구입니다. **이 패키지 하나만 설치**하면 [`@aicqtools/guardrail`](https://www.npmjs.com/package/@aicqtools/guardrail), [`@aicqtools/provenance`](https://www.npmjs.com/package/@aicqtools/provenance), [`@aicqtools/core`](https://www.npmjs.com/package/@aicqtools/core), [`@aicqtools/rule-sdk`](https://www.npmjs.com/package/@aicqtools/rule-sdk)가 의존성으로 함께 설치됩니다.

## 설치

```bash
# 베타 (현재 latest tag)
npm install --save-dev @aicqtools/cli
# 또는 명시적
npm install --save-dev @aicqtools/cli@beta
# 알파를 핀하려면
# npm install --save-dev @aicqtools/cli@alpha
```

설치하면 `aicq` 바이너리가 `node_modules/.bin/`에 추가됩니다. `npx aicq` 또는 `package.json`의 `scripts`에서 호출하세요.

## 명령어

| 명령 | 용도 |
|------|------|
| `aicq init` | 스택별 `aicq.config.yaml` + `.github/workflows/aicq-check.yml`을 한 번에 생성 (`--stack next\|nest\|capacitor\|generic`) |
| `aicq check` | 가드레일 룰 50개로 프로젝트 검사 (text/JSON/SARIF 출력) |
| `aicq sync-ai-rules` | `.cursorrules` / `CLAUDE.md`에 룰 컨텍스트 자동 주입 |
| `aicq mcp` | Claude Code/Cursor용 MCP(Model Context Protocol) 서버 시작 |
| `aicq provenance capture` | Git staged 변경 + 활성 AI 세션을 JSON으로 기록 |
| `aicq provenance report <record>` | 캡처본을 EU AI Act Article 50 리포트(HTML/PDF) 또는 AI-BOM(CycloneDX 1.6)으로 변환. `--guardrail-result <path>`로 `aicq check --format json` 결과를 첨부하면 가드레일 위반 요약 섹션 포함 (1.0.0-beta.2+) |
| `aicq docs build` | 룰 50개의 마크다운 문서 자동 생성 (한/영) |

각 명령은 `aicq <명령> --help`로 전체 플래그를 볼 수 있습니다. 메시지 언어는 모든 명령에서 `--locale ko|en`으로 전환합니다.

## 자주 쓰는 시나리오

### 1) 처음 도입 — init + 검사 + AI 룰 동기화

```bash
# 스택 선택 → aicq.config.yaml + .github/workflows/aicq-check.yml 생성
npx aicq init --stack next   # 또는 nest | capacitor | generic
# 기존 파일이 있으면 거부됨, 덮어쓰려면 --force
# CI 워크플로 없이 config만 만들고 싶으면 --no-workflow

# 50개 룰로 src/ 검사 (warning은 종료코드 0, error는 1)
npx aicq check --locale ko

# .cursorrules와 CLAUDE.md를 50개 룰 요약으로 갱신
# → Claude Code/Cursor가 다음 코드 생성 시 이 컨텍스트를 사용
npx aicq sync-ai-rules --locale ko
```

### 2) Claude Code와 실시간 연동 (MCP)

코드가 *생성된 후*가 아니라 *생성되기 전* prompt 단계에서 차단합니다.

```bash
claude mcp add --transport stdio aicq -- \
  node /절대경로/node_modules/@aicqtools/cli/dist/bin.js mcp
```

상세 가이드: [docs/mcp-claude-code-setup.md](https://github.com/aicqtools/aicqtools/blob/HEAD/docs/mcp-claude-code-setup.md)

### 3) EU AI Act Article 50 PDF 리포트

```bash
# AI 세션 자동 감지 + 캡처
npx aicq provenance capture --reader claude-code \
  --output capture.json

# PDF 렌더링 (puppeteer 옵션 peer 필요 — pnpm add puppeteer)
npx aicq provenance report capture.json \
  --format article-50-pdf --locale ko \
  --output report.pdf
```

PDF가 필요 없으면 `--format article-50-html`로 HTML만 생성 가능 (puppeteer 의존성 불필요). 기계 가독 포맷이 필요하면 `--format ai-bom`으로 CycloneDX 1.6 JSON을 출력합니다.

#### 가드레일 위반 요약 통합 (1.0.0-beta.2+)

```bash
# 1. 가드레일 결과를 JSON으로 저장
npx aicq check --format json --output check.json

# 2. provenance report에 첨부 → 리포트에 가드레일 위반 요약 섹션 포함
#    (총 위반 / 위반 포함 파일 / 심각도 분포 / 룰 카테고리 분포)
npx aicq provenance report capture.json \
  --format article-50-html --locale ko \
  --guardrail-result check.json > report.html
```

JSON / HTML / PDF 세 포맷 모두 `--guardrail-result` 지원. 옵션 생략 시 가드레일 섹션 없는 기존 출력을 그대로 유지합니다 (backward compatible).

## 출력 포맷

`aicq check`의 `--format` 플래그:
- `text`(기본) — 사람이 읽기 좋은 컬러 출력
- `json` — 프로그래밍적 후처리용
- `sarif` — SARIF 2.1.0(GitHub Code Scanning, VS Code SARIF Viewer 호환)

## 더 알아보기

전체 문서 · 룰 50개 목록 · 로드맵: [aicqtools 모노레포 README](https://github.com/aicqtools/aicqtools)

## 라이선스

MIT — Eom Sik <neuralflux3@gmail.com>
