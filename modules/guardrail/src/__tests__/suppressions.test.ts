import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@aicqtools/core';
import { parseSource } from '@aicqtools/core';
import { applySuppressions, parseSuppressions } from '../runner/suppressions.js';
import { runFileWithSource } from '../runner/run-file.js';
import { loadAllBuiltinRules } from '../rules-default/index.js';

function fakeDiag(ruleId: string, line: number): Diagnostic {
  return {
    ruleId,
    severity: 'warning',
    message: ruleId,
    file: 'x.ts',
    range: { start: { line, column: 1 }, end: { line, column: 1 } },
  };
}

describe('parseSuppressions — directive parsing', () => {
  it('parses `aicq-disable-next-line <rule>` and applies to the next line', () => {
    const src = '// aicq-disable-next-line no-console-log\nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    // The comment is on row 0 (line 1), so next line is 2.
    const ids = sup.byLine.get(2);
    expect(ids).toBeInstanceOf(Set);
    expect((ids as Set<string>).has('no-console-log')).toBe(true);
  });

  it('parses `aicq-disable-line <rule>` for the comment line itself (trailing)', () => {
    const src = 'console.log("x"); // aicq-disable-line no-console-log\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    const ids = sup.byLine.get(1);
    expect(ids).toBeInstanceOf(Set);
    expect((ids as Set<string>).has('no-console-log')).toBe(true);
  });

  it('parses `aicq-disable-file <rule>` for the whole file', () => {
    const src = '// aicq-disable-file no-console-log\nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    expect(sup.fileLevel).toBeInstanceOf(Set);
    expect((sup.fileLevel as Set<string>).has('no-console-log')).toBe(true);
  });

  it('treats a bare directive as suppress-all', () => {
    const src = '// aicq-disable-next-line\nthrow null;\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    expect(sup.byLine.get(2)).toBe('*');
  });

  it('accepts a comma- or whitespace-separated list of rule ids', () => {
    const src = '// aicq-disable-next-line no-console-log, no-bare-throw  some-other\nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    const ids = sup.byLine.get(2) as Set<string>;
    expect(ids.has('no-console-log')).toBe(true);
    expect(ids.has('no-bare-throw')).toBe(true);
    expect(ids.has('some-other')).toBe(true);
  });

  it('recognizes block comments and `aicq-disable-file` inside them', () => {
    const src = '/* aicq-disable-file no-console-log */\nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    expect(sup.fileLevel).toBeInstanceOf(Set);
    expect((sup.fileLevel as Set<string>).has('no-console-log')).toBe(true);
  });

  it('recognizes `#`-prefixed directives in Python', () => {
    const src = '# aicq-disable-next-line no-bare-except\ntry:\n    pass\nexcept:\n    pass\n';
    const tree = parseSource('python', src);
    const sup = parseSuppressions(tree, src, 'python');
    expect(sup.byLine.get(2)).toBeInstanceOf(Set);
    expect((sup.byLine.get(2) as Set<string>).has('no-bare-except')).toBe(true);
  });

  it('does not throw on a malformed directive', () => {
    const src = '// aicq-disable-next-line ,,, \nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    expect(() => parseSuppressions(tree, src, 'typescript')).not.toThrow();
    // Comma-only payload trims to empty list → bare directive → '*'
    const sup = parseSuppressions(tree, src, 'typescript');
    expect(sup.byLine.get(2)).toBe('*');
  });

  it('ignores comments that do not contain a directive', () => {
    const src = '// just a regular comment\n// TODO: refactor\nconsole.log("x");\n';
    const tree = parseSource('typescript', src);
    const sup = parseSuppressions(tree, src, 'typescript');
    expect(sup.fileLevel).toBeNull();
    expect(sup.byLine.size).toBe(0);
  });
});

describe('applySuppressions — diagnostic filtering', () => {
  it('drops a diagnostic on a suppressed line', () => {
    const diags = [fakeDiag('no-console-log', 2), fakeDiag('no-console-log', 5)];
    const sup = {
      byLine: new Map([[2, new Set(['no-console-log'])]]),
      fileLevel: null,
    };
    const filtered = applySuppressions(diags, sup);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.range.start.line).toBe(5);
  });

  it('drops all diagnostics for a `*` line suppression', () => {
    const diags = [fakeDiag('a', 2), fakeDiag('b', 2), fakeDiag('a', 3)];
    const sup = { byLine: new Map<number, Set<string> | '*'>([[2, '*']]), fileLevel: null };
    expect(applySuppressions(diags, sup)).toHaveLength(1);
  });

  it('drops all diagnostics for a `*` file-level suppression', () => {
    const diags = [fakeDiag('a', 1), fakeDiag('b', 2), fakeDiag('c', 99)];
    const sup = { byLine: new Map(), fileLevel: '*' as const };
    expect(applySuppressions(diags, sup)).toEqual([]);
  });

  it('honors a file-level suppression scoped to specific rule ids', () => {
    const diags = [fakeDiag('a', 1), fakeDiag('b', 2)];
    const sup = { byLine: new Map(), fileLevel: new Set(['a']) };
    const out = applySuppressions(diags, sup);
    expect(out).toHaveLength(1);
    expect(out[0]?.ruleId).toBe('b');
  });

  it('returns the input untouched when there are no suppressions', () => {
    const diags = [fakeDiag('a', 1)];
    const sup = { byLine: new Map(), fileLevel: null };
    expect(applySuppressions(diags, sup)).toEqual(diags);
  });
});

describe('runFileWithSource — end-to-end suppression', () => {
  it('suppresses a real built-in rule diagnostic via inline directive', async () => {
    const rules = await loadAllBuiltinRules();
    const noConsole = rules.filter((r) => r.id === 'no-console-log');
    expect(noConsole.length).toBeGreaterThan(0);

    const src = '// aicq-disable-next-line no-console-log\nconsole.log("ok");\nconsole.log("flag");\n';
    const result = runFileWithSource('x.ts', src, 'typescript', noConsole);
    // Line 2 (suppressed) drops; line 3 (no directive) remains.
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.range.start.line).toBe(3);
  });

  it('a file-level directive suppresses every diagnostic in the file', async () => {
    const rules = await loadAllBuiltinRules();
    const noConsole = rules.filter((r) => r.id === 'no-console-log');

    const src = '// aicq-disable-file no-console-log\nconsole.log("a");\nconsole.log("b");\n';
    const result = runFileWithSource('x.ts', src, 'typescript', noConsole);
    expect(result.diagnostics).toHaveLength(0);
  });
});
