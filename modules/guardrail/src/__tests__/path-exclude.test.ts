import { describe, expect, it } from 'vitest';
import type { Rule } from '@aicqtools/rule-sdk';
import { runFileWithSource } from '../runner/run-file.js';
import { loadAllBuiltinRules } from '../rules-default/index.js';

describe('rule.pathExclude — file-path allow-list for built-in rules', () => {
  it('skips no-direct-openai inside `**/llm/client.*` (designated wrapper convention)', async () => {
    const rules = await loadAllBuiltinRules();
    const r = rules.filter((x) => x.id === 'no-direct-openai');
    expect(r.length).toBe(1);

    const src = 'const c = new OpenAI({ apiKey: "x" });\n';
    const wrapperPath = 'project/src/services/llm/client.ts';
    const result = runFileWithSource(wrapperPath, src, 'typescript', r);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('still flags no-direct-openai outside the designated paths', async () => {
    const rules = await loadAllBuiltinRules();
    const r = rules.filter((x) => x.id === 'no-direct-openai');
    const src = 'const c = new OpenAI({ apiKey: "x" });\n';
    const result = runFileWithSource('project/src/routes/handler.ts', src, 'typescript', r);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('matches even when the path uses backslashes (Windows)', async () => {
    const rules = await loadAllBuiltinRules();
    const r = rules.filter((x) => x.id === 'no-direct-anthropic');
    const src = 'const c = new Anthropic({ apiKey: "x" });\n';
    const winPath = 'project\\src\\services\\llm\\client.ts';
    const result = runFileWithSource(winPath, src, 'typescript', r);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('also recognizes a generic `**/ai/**/*client*.*` convention', async () => {
    const rules = await loadAllBuiltinRules();
    const r = rules.filter((x) => x.id === 'no-direct-openai');
    const src = 'const c = new OpenAI({ apiKey: "x" });\n';
    const result = runFileWithSource('project/src/services/ai/openai-client.ts', src, 'typescript', r);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('respects pathExclude on user-defined function rules too', () => {
    const rule: Rule = {
      kind: 'function',
      id: 'test-rule',
      language: 'typescript',
      severity: 'error',
      message: 'forbidden',
      pathExclude: ['**/allowed/**'],
      visitors: {
        identifier(node, ctx) {
          if (ctx.textOf(node) === 'banana') ctx.report({ node });
        },
      },
    };
    const src = 'const banana = 1;\n';
    expect(runFileWithSource('project/src/allowed/x.ts', src, 'typescript', [rule]).diagnostics).toHaveLength(0);
    expect(runFileWithSource('project/src/forbidden/x.ts', src, 'typescript', [rule]).diagnostics.length).toBeGreaterThan(0);
  });
});
