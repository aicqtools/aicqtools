import { describe, it, expect } from 'vitest';
import { handleCheckSnippet, handleListRules } from '../mcp/handlers.js';
import noConsoleLog from '../rules-default/no-console-log.js';

describe('MCP handleCheckSnippet', () => {
  it('returns diagnostics for a violating snippet', () => {
    const result = handleCheckSnippet(
      { source: `console.log("x");\n`, language: 'typescript' },
      [noConsoleLog],
    );
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-console-log');
    expect(result.diagnostics[0]?.line).toBe(1);
  });

  it('returns empty for clean snippet', () => {
    const result = handleCheckSnippet(
      { source: `const x = 1;\n`, language: 'typescript' },
      [noConsoleLog],
    );
    expect(result.diagnostics).toHaveLength(0);
  });

  it('throws on invalid input', () => {
    expect(() =>
      handleCheckSnippet({ source: 1, language: 'typescript' }, [noConsoleLog]),
    ).toThrow();
  });

  it('uses messageKo when available', () => {
    const result = handleCheckSnippet(
      { source: `console.log("x");\n`, language: 'typescript' },
      [noConsoleLog],
    );
    expect(result.diagnostics[0]?.message).toContain('console.log');
  });
});

describe('MCP handleListRules', () => {
  it('lists rule metadata', () => {
    const result = handleListRules([noConsoleLog]);
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]?.id).toBe('no-console-log');
    expect(result.rules[0]?.languages).toContain('typescript');
  });
});
