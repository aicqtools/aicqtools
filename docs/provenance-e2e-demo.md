# Provenance e2e demo (Phase 0)

AI 코드 출처 추적기를 git pre-commit 시점에 실제로 적용해보는 시나리오. EU AI Act Article 50 / CycloneDX AI-BOM 출력까지.

## 사전 준비

```bash
cd d:/AI/Projects/aicq
pnpm build
```

## 1. AI 세션 정보 기록

`examples/talkup-mirror/.aicq/sessions.json` (gitignored)에 현재 진행 중인 AI 세션들을 기록. 실제 사용 시에는 IDE 플러그인이나 git pre-commit hook이 자동으로 작성하지만, Phase 0 PoC에서는 수동.

```json
{
  "sessions": [
    {
      "sessionId": "cc-2026-05-07-001",
      "tool": "claude-code",
      "model": "claude-opus-4-7",
      "modelVersion": "claude-opus-4-7-20260101",
      "startedAt": "2026-05-07T15:30:00Z",
      "endedAt": "2026-05-07T16:00:00Z"
    },
    {
      "sessionId": "cu-2026-05-07-002",
      "tool": "cursor",
      "model": "gpt-5",
      "modelVersion": "gpt-5-20260301",
      "startedAt": "2026-05-07T16:30:00Z",
      "endedAt": "2026-05-07T17:00:00Z"
    }
  ],
  "prompts": [
    {
      "sessionId": "cc-2026-05-07-001",
      "index": 0,
      "prompt": "uses-foo.ts에 데모 함수 추가해줘",
      "timestamp": "2026-05-07T15:35:00Z"
    }
  ]
}
```

## 2. 변경을 staged 상태로

```bash
git add examples/talkup-mirror/src/uses-foo.ts
```

## 3. 캡처

```bash
cd examples/talkup-mirror
node ../../packages/cli/dist/bin.js provenance capture
# → provenance captured: aicq/provenance/<timestamp>.json
# → 1 attribution(s), 2 session(s)
```

생성된 JSON에는 `sessions` / `prompts` / `attributions` 가 포함됨. attribution은 staged hunk를 가장 가까운 시각의 세션에 매핑한다(`findClosestSession`, [modules/provenance/src/git-hook/session-source.ts](../modules/provenance/src/git-hook/session-source.ts)).

## 4. EU AI Act Article 50 리포트

```bash
node ../../packages/cli/dist/bin.js provenance report aicq/provenance/<file>.json --format article-50
```

출력:
```json
{
  "format": "aicq-article50/0.1",
  "generatedAt": "...",
  "aiSystems": [
    { "tool": "claude-code", "model": "claude-opus-4-7", "sessionCount": 1 },
    { "tool": "cursor", "model": "gpt-5", "sessionCount": 1 }
  ],
  "attributedFiles": ["examples/talkup-mirror/src/uses-foo.ts"]
}
```

이 JSON은 `aicq-article50/0.1` 스키마. v1.0에서는 같은 데이터로 PDF도 생성 (E3 작업 예정).

## 5. CycloneDX AI-BOM

```bash
node ../../packages/cli/dist/bin.js provenance report aicq/provenance/<file>.json --format ai-bom
```

출력은 `bomFormat: CycloneDX, specVersion: 1.6` 표준. 각 AI 모델이 `machine-learning-model` 컴포넌트로 등록되어 SBOM 도구체인(syft, cdxgen)과 호환됨.

## 6. 이어진 git 흐름

```bash
git commit -m "feat: add alsoViolator helper"
# → 커밋 후 aicq/provenance/<ts>.json은 그대로 보존 (gitignored이지만 로컬 감사 로그)
```

Phase 1a에서는 git post-commit hook이 자동으로 capture를 수행하고, 결과를 `aicq/provenance/<commit-sha>.json` 형태로 저장하도록 전환 예정.

## 알려진 한계 (v1.0에서 보강)

- `humanEdited` 판정이 단순함 — `closest session === null` 이면 human, 아니면 AI. 실제로는 staged diff의 line-by-line analysis가 필요. (Phase 1a의 Claude Code session.jsonl 네이티브 리더가 들어오면 정확도 ↑)
- `prompts` 배열은 sessions.json에 직접 적힌 만큼만 포함. Cursor/Claude Code 세션 로그를 자동 파싱하는 reader는 Phase 1a (E1, E2).
- Article 50 PDF 렌더러는 아직 없음. 현재 JSON만 (Phase 1a의 E3).
