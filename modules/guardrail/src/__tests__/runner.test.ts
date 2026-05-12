import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noConsoleLog from '../rules-default/no-console-log.js';
import { parseYamlRule } from '../matcher/yaml-rule.js';

describe('function rule: no-console-log', () => {
  it('detects console.log call', () => {
    const source = `function greet() {\n  console.log("hi");\n}\n`;
    const result = runFileWithSource('greet.ts', source, 'typescript', [noConsoleLog]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-console-log');
    expect(result.diagnostics[0]?.range.start.line).toBe(2);
  });

  it('does not flag non-console calls', () => {
    const source = `logger.log("safe");\n`;
    const result = runFileWithSource('a.ts', source, 'typescript', [noConsoleLog]);
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe('YAML pattern rule: no-direct-openai', () => {
  const rule = parseYamlRule(`
id: no-direct-openai
language: typescript
severity: error
message: Use llmClient singleton.
messageKo: llmClient 싱글톤을 사용하세요.
query: |
  (new_expression
    constructor: (identifier) @ctor
    (#eq? @ctor "OpenAI"))
`);

  it('detects direct OpenAI instantiation', () => {
    const source = `const client = new OpenAI({ apiKey: "x" });\n`;
    const result = runFileWithSource('a.ts', source, 'typescript', [rule]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-direct-openai');
  });

  it('does not flag llmClient usage', () => {
    const source = `import { llmClient } from './client';\nconst c = llmClient;\n`;
    const result = runFileWithSource('a.ts', source, 'typescript', [rule]);
    expect(result.diagnostics).toHaveLength(0);
  });

  // alpha.3 regression: running the same pattern rule across multiple files threw
  // "SyntaxNode must belong to a Tree" because tree-sitter@~0.22.4 binds Tree nodes
  // to the Parser that produced them. Fixed in alpha.4 (parserCache removed).
  it('runs the same pattern rule on many files without throwing', () => {
    for (let i = 0; i < 25; i++) {
      const source = `const c${i} = new OpenAI({ apiKey: "${i}" });\n`;
      const result = runFileWithSource(`a${i}.ts`, source, 'typescript', [rule]);
      expect(result.diagnostics).toHaveLength(1);
    }
  });
});
