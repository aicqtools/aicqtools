# Data Handling Policy / 데이터 처리 정책

> 한국 핀테크/SaaS 도입 시 보안·법무·금감원 검사 대응을 위해 본 문서를 단일 진실원(single source of truth)으로 사용하세요.
>
> Use this document as the single source of truth for security, legal, and FSC-audit reviews when adopting aicqtools in Korean fintech / SaaS environments.

## 🇰🇷 한국어

### 핵심 약속 (5줄 요약)

1. **aicqtools는 100% 로컬 실행 도구입니다.** 사용자 코드 / AST / 위반 결과를 외부 서비스로 송신하지 않습니다.
2. **텔레메트리는 기본 OFF입니다.** 베타 phase 동안 텔레메트리 자체를 구현하지 않습니다. 향후 도입 시에도 default OFF + 명시적 opt-in을 유지합니다.
3. **외부 네트워크 호출은 npm registry 외에 없습니다.** `npm install` 시 의존성 다운로드(npmjs.org) 외 런타임 외부 호출 없음.
4. **MCP 모드는 사용자 IDE가 직접 LLM과 통신합니다.** aicqtools 서버는 stdio JSON-RPC만 처리하고, LLM 응답 송수신은 사용자 IDE의 책임 범위입니다.
5. **사용자 데이터의 외부 노출 책임은 사용자에게 있습니다.** SARIF / JSON 리포트를 CI 아티팩트 / 외부 시스템에 업로드할지 사용자 정책에 따라 결정합니다.

### 적용 범위

본 정책은 다음에 적용됩니다:

- npm 패키지 `@aicqtools/{core, cli, rule-sdk, guardrail, provenance}` 1.0.0-beta.x 전체
- GitHub Action `packages/action/` (활성 단계)
- 공식 docs site

### 데이터 흐름 상세

#### `aicq check` 실행 시

| 단계 | 데이터 | 위치 | 외부 송신 |
|------|------|------|---------|
| 1. 파일 스캔 | 사용자 source code | 로컬 파일 시스템 | ❌ |
| 2. tree-sitter 파싱 | AST | 메모리 only | ❌ |
| 3. 룰 평가 | 위반 diagnostic | 메모리 → 로컬 SQLite 캐시(`.aicq/cache.sqlite`) | ❌ |
| 4. 리포트 출력 | SARIF / JSON / text | stdout 또는 로컬 파일 (`aicq-report-*.sarif`) | ❌ |
| 5. (선택) CI 업로드 | SARIF | 사용자 CI/GitHub Code Scanning | ✅ **사용자 책임** |

**중요:** 5단계의 외부 노출은 사용자가 GitHub Code Scanning, Codecov 등에 SARIF를 업로드하는 경우에 한정되며, aicqtools가 자동 수행하지 않습니다.

#### `aicq mcp` 실행 시 (MCP 서버 모드)

- aicqtools는 **stdio JSON-RPC**로 IDE와 통신하는 MCP 서버 역할만 합니다.
- LLM과의 통신은 **사용자 IDE**(예: Claude Code, Cursor)가 수행합니다.
- aicqtools 자체는 LLM API 키를 보관하거나 외부 LLM 서비스에 직접 호출하지 않습니다.

#### `aicq provenance` 실행 시

- 입력: AI 도구가 생성한 결과 메타데이터(JSON)
- 출력: SBOM (CycloneDX/SPDX) 및 EU AI Act Article 50 리포트 (HTML/PDF)
- **외부 송신 없음.** 모든 처리는 로컬에서 완료.

### PII (개인정보) 처리

- aicqtools는 사용자 코드 내 PII를 **검출하기 위한 룰**(예: `mask-pii-in-ai-prompt`, `redact-resident-number`)을 제공하지만, **본 도구 자체는 PII를 수집·저장·전송하지 않습니다.**
- 위반 메시지에는 코드 위치(파일 경로, 줄 번호)와 룰 ID가 포함되며, 실제 PII 값은 메시지에 포함하지 않습니다.

### 캐시 정책

- 로컬 SQLite 캐시(`.aicq/cache.sqlite`)는 파싱 결과 해시를 저장해 재실행 속도를 높입니다.
- 캐시는 **사용자 작업 디렉토리에만** 생성되며 사용자가 자유롭게 삭제할 수 있습니다(`rm -rf .aicq/`).
- `aicq check --no-cache` 옵션으로 캐시 자체를 우회할 수 있습니다.
- 캐시는 사용자 코드 내용을 평문으로 보관하지 않습니다(해시만 저장).

### 텔레메트리 (현재 OFF)

- 베타 phase 동안 **텔레메트리 코드 자체가 구현되어 있지 않습니다.**
- 향후 도입을 검토할 경우 다음 원칙을 따릅니다:
  - 기본값 OFF, opt-in only
  - 코드 / AST / 위반 데이터 자체는 절대 송신하지 않음 (전송 데이터는 익명 집계 통계 한정)
  - 텔레메트리 코드를 별도 패키지로 분리해 사용자가 의존성 트리에서 명시적으로 확인 가능
  - 본 문서를 사전 갱신 후 release notes에 명시

### 한국 컴플라이언스 대응 자산

- **금감원 AI 가이드라인** — aicqtools가 검사하는 룰 5종(PII 마스킹, 설명가능성 메타데이터, AI 의사결정 감사 로그, 인간 감독, 모델 버전 추적)은 사용자 코드를 **검증**하기 위한 도구이며, aicqtools 자체가 가이드라인 적용 주체는 아닙니다.
- **개인정보보호법** — aicqtools는 사용자 PII를 처리하지 않으므로 개인정보처리방침 작성 의무 대상이 아닙니다. 다만 본 도구로 생성된 리포트(SARIF / JSON)를 외부 시스템에 업로드하는 경우, 해당 시스템의 정책이 적용됩니다.
- **ISMS-P / SOC 2** — SBOM(CycloneDX/SPDX)을 GitHub Release asset으로 자동 첨부하는 기능을 1.0.0 stable 시점에 도입 예정 (ROADMAP §1.1 참고).

### 라이선스 / 의존성 안전성

- 라이선스: MIT (모든 5 패키지 동일)
- 의존성 라이선스 호환성: GPL/AGPL 0건 (별도 보고서 `docs/legal/dependency-licenses.md`에 정량 산출 예정 — Phase C)
- 의존성 취약점: Dependabot으로 추적, `npm audit` CI 통과 강제

### 변경 이력

- **2026-05-21** — 본 정책 최초 작성 (beta.1 진입에 맞춰 도입 결재 통과 자산으로 정비)

---

## 🇬🇧 English

### Five-line summary

1. **aicqtools is a 100% local-execution tool.** No user code / AST / violation data is transmitted to any external service.
2. **Telemetry is OFF by default.** No telemetry code is implemented during the beta phase. If introduced later, default OFF + explicit opt-in is non-negotiable.
3. **No external network calls beyond the npm registry.** Only `npm install` reaches npmjs.org; there are no runtime external calls.
4. **MCP mode: your IDE talks to the LLM, not aicqtools.** The aicqtools MCP server handles only stdio JSON-RPC; the LLM round-trip happens on the IDE side.
5. **You own outbound exposure of your data.** Whether to upload SARIF/JSON reports to CI artifacts or external systems is governed by your policy, not ours.

### Scope

This policy applies to:

- npm packages `@aicqtools/{core, cli, rule-sdk, guardrail, provenance}` across all 1.0.0-beta.x versions
- GitHub Action under `packages/action/` (once active)
- The official docs site

### Detailed data flow

#### `aicq check`

| Step | Data | Location | External transmission |
|------|------|----------|----------------------|
| 1. File scan | User source code | Local FS | ❌ |
| 2. tree-sitter parse | AST | Memory only | ❌ |
| 3. Rule evaluation | Violation diagnostics | Memory → local SQLite cache (`.aicq/cache.sqlite`) | ❌ |
| 4. Report output | SARIF / JSON / text | stdout or local file (`aicq-report-*.sarif`) | ❌ |
| 5. (Optional) CI upload | SARIF | User's CI / GitHub Code Scanning | ✅ **User-controlled** |

**Important:** Step 5 exposure happens only when the user explicitly uploads SARIF to GitHub Code Scanning, Codecov, etc. aicqtools never does this automatically.

#### `aicq mcp` (MCP server mode)

- aicqtools acts as a **stdio JSON-RPC** MCP server only.
- LLM communication is performed by the **user's IDE** (e.g. Claude Code, Cursor).
- aicqtools itself does not store LLM API keys or make direct LLM service calls.

#### `aicq provenance`

- Input: metadata describing AI-tool outputs (JSON)
- Output: SBOM (CycloneDX/SPDX) and EU AI Act Article 50 reports (HTML/PDF)
- **No external transmission.** All processing is local.

### PII handling

- aicqtools provides **detection rules** for PII in user code (e.g. `mask-pii-in-ai-prompt`, `redact-resident-number`), but **the tool itself does not collect, store, or transmit any PII**.
- Violation messages include only the source location (file path, line) and the rule ID; raw PII values are not embedded in messages.

### Cache policy

- The local SQLite cache (`.aicq/cache.sqlite`) stores parse-result hashes to speed up re-runs.
- The cache is created **only in your working directory** and can be deleted at any time (`rm -rf .aicq/`).
- Use `aicq check --no-cache` to bypass the cache entirely.
- The cache never stores raw source content (hashes only).

### Telemetry (currently OFF)

- **No telemetry code is implemented during the beta phase.**
- If introduced later, the following principles are binding:
  - Default OFF, opt-in only
  - Code / AST / violation data is never transmitted (only anonymized aggregate stats may be)
  - Telemetry code lives in a separate package so it appears explicitly in your dependency tree
  - This document is updated **before** release, and the change is called out in release notes

### Korean compliance posture

- **FSC (금감원) AI guidelines** — aicqtools rules (PII masking, explainability metadata, AI-decision audit log, human oversight, model-version tracking) are tools for **verifying user code**; aicqtools itself is not the regulated subject.
- **PIPA (개인정보보호법)** — aicqtools processes no user PII and is not subject to privacy-policy disclosure obligations. If you upload generated reports (SARIF / JSON) to external systems, those systems' policies apply.
- **ISMS-P / SOC 2** — Automatic SBOM (CycloneDX/SPDX) attachment to GitHub Releases is planned for 1.0.0 stable (see ROADMAP §1.1).

### License / dependency safety

- License: MIT (all 5 packages)
- Dependency-license compatibility: 0 GPL/AGPL packages (a quantitative report at `docs/legal/dependency-licenses.md` is planned for Phase C)
- Dependency vulnerabilities: tracked via Dependabot; `npm audit` enforced in CI

### Change log

- **2026-05-21** — Initial version (introduced alongside beta.1 entry as part of adoption-clearance assets)
