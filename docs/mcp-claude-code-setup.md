# aicq MCP server — Claude Code / Cursor 설정 가이드

aicq의 가드레일 룰을 **AI가 코드를 만드는 시점에** 검증하기 위해 MCP 서버로 등록합니다. AI 출력이 commit 후 `aicq check`를 통과 못 하기 전, prompt 수준에서 미리 차단할 수 있습니다.

> ★ 차별화 포인트: CodeRabbit/Codacy는 사후 검증, aicq는 **사전(prompt 시점) 차단**.

---

## 1. 사전 준비

```bash
cd d:/AI/Projects/aicq
pnpm install
pnpm build
```

빌드 산출물 위치: `d:/AI/Projects/aicq/packages/cli/dist/bin.js`

서버 시작 명령(검증용):
```bash
node d:/AI/Projects/aicq/packages/cli/dist/bin.js mcp
# stdin/stdout으로 MCP JSON-RPC 대기
```

---

## 2. Claude Code에 등록

### 방법 A — 권장: `claude mcp add` 명령

```bash
claude mcp add --transport stdio aicq -- node d:/AI/Projects/aicq/packages/cli/dist/bin.js mcp
```

### 방법 B — 수동: `settings.json` 편집

설정 파일 위치(우선순위 순):

| 범위 | 위치 |
|------|------|
| 프로젝트 | `<repo>/.claude/settings.json` |
| 사용자 | Windows: `C:\Users\<user>\.claude\settings.json` / macOS·Linux: `~/.claude/settings.json` |

다음 항목을 `mcpServers`에 추가합니다 (없으면 키 생성):

```json
{
  "mcpServers": {
    "aicq": {
      "type": "stdio",
      "command": "node",
      "args": [
        "d:/AI/Projects/aicq/packages/cli/dist/bin.js",
        "mcp"
      ]
    }
  }
}
```

**주의**:
- 절대경로 사용 (`~` 미확장)
- 변경 후 Claude Code 재시작 필요
- 시크릿(`env`)을 함께 두지 말 것

---

## 3. Cursor에 등록

Cursor도 동일한 MCP stdio transport를 지원합니다.

`Settings → MCP → Add new MCP server`에서:

```json
{
  "name": "aicq",
  "type": "stdio",
  "command": "node",
  "args": ["d:/AI/Projects/aicq/packages/cli/dist/bin.js", "mcp"]
}
```

---

## 4. 등록 후 사용

Claude Code/Cursor 채팅에서 두 가지 도구가 노출됩니다:

| Tool | 설명 |
|------|------|
| `aicq.checkSnippet` | 입력: `{ source, language, filePath? }` / 출력: `{ diagnostics: [{ ruleId, severity, message, line, column }, ...] }` |
| `aicq.listRules` | 로드된 룰 메타데이터 목록 |

### 사용 예 (Claude Code 프롬프트)

> "이 TypeScript 스니펫을 aicq로 검사해줘:
> ```ts
> const c = new OpenAI({ apiKey: process.env.OPENAI_KEY });
> ```"

Claude Code는 자동으로 `aicq.checkSnippet`을 호출하고 결과를 받습니다:

```json
{
  "diagnostics": [
    {
      "ruleId": "no-direct-openai",
      "severity": "error",
      "message": "llmClient 싱글톤을 사용하세요. 직접 OpenAI 인스턴스화는 금지입니다.",
      "line": 1,
      "column": 11
    }
  ]
}
```

이 결과를 받은 LLM이 **직접 인스턴스화 대신 `llmClient`를 사용한 코드로 응답**하는 것이 prompt 시점 차단의 본질입니다.

---

## 5. 검증

설정 후 Claude Code 재시작 → 채팅에서:

```
aicq에 어떤 룰이 등록되어 있는지 listRules로 보여줘
```

`listRules` 결과로 8개 룰이 나오면 정상.

---

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| Claude Code가 aicq 도구를 못 봄 | 재시작 안 함 → 완전히 종료 후 재실행 |
| `Cannot find module ...` | 빌드 안 됨 → `cd d:/AI/Projects/aicq && pnpm build` |
| `path not found` | `~` 사용 → 절대경로(`C:\Users\...`)로 변경 |
| 도구는 보이지만 호출 시 에러 | dist 파일 권한 / Node.js 20+ 미설치 확인 |

---

## 7. v1.0 이후 단순화

v1.0 출시 후에는 다음과 같이 npm 패키지로 직접 등록 가능:

```json
{
  "mcpServers": {
    "aicq": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@aicqtools/cli", "mcp"]
    }
  }
}
```

(스코프 `@aicqtools`는 임시명. 통합 브랜드 결정 시점(Phase 5)에 일괄 교체 가능)

---

## English Version (Summary)

Register `aicq mcp` as an MCP stdio server in Claude Code or Cursor to enforce guardrail rules **at prompt time**, before commit.

**Quick install (Claude Code):**
```bash
claude mcp add --transport stdio aicq -- node d:/AI/Projects/aicq/packages/cli/dist/bin.js mcp
```

**Manual `settings.json`:**
```json
{
  "mcpServers": {
    "aicq": {
      "type": "stdio",
      "command": "node",
      "args": ["d:/AI/Projects/aicq/packages/cli/dist/bin.js", "mcp"]
    }
  }
}
```

Tools exposed: `aicq.checkSnippet({ source, language, filePath? })`, `aicq.listRules()`.

Restart Claude Code after editing the config.

## Sources
- [Connect Claude Code to tools via MCP — Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [Install and Configure MCP Servers in Claude Code (2026) — systemprompt.io](https://systemprompt.io/guides/claude-code-mcp-servers-extensions)
- [Configuring MCP Tools in Claude Code — Scott Spence](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)
