import { describe, expect, it } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noConsoleLog from '../rules-default/no-console-log.js';

/**
 * Alpha.17 — `@aicq/unused-suppression` info diagnostic. Covers:
 *   1. default off + unused directive → 0 unused diagnostics (regression guard)
 *   2. opt-in + unused → 1 info diagnostic with ruleId `@aicq/unused-suppression`
 *   3. opt-in + used directive → 0 unused diagnostics
 *   4. opt-in + file-level unused → diagnostic at directive line
 *   5. opt-in + partial match (one of two rules matched) → 1 unused diagnostic for the other
 *   6. opt-in + bare directive (wildcard) + zero diagnostics → 1 unused diagnostic
 */
describe('@aicq/unused-suppression (alpha.17)', () => {
  it('1. default off — unused directive emits no info diagnostic (regression guard)', () => {
    const src = '// aicq-disable-line no-console-log\nconst x = 1;\nvoid x;\n';
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('2. opt-in + unused directive → @aicq/unused-suppression info diagnostic', () => {
    const src = '// aicq-disable-line no-console-log\nconst x = 1;\nvoid x;\n';
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog], {
      reportUnusedSuppressions: true,
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('@aicq/unused-suppression');
    expect(result.diagnostics[0]?.severity).toBe('info');
    expect(result.diagnostics[0]?.range.start.line).toBe(1);
  });

  it('3. opt-in + used directive → no unused diagnostic', () => {
    const src = "// aicq-disable-next-line no-console-log\nconsole.log('x');\n";
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog], {
      reportUnusedSuppressions: true,
    });
    expect(result.diagnostics).toHaveLength(0);
  });

  it('4. opt-in + file-level unused → diagnostic at directive line', () => {
    const src = '// aicq-disable-file no-console-log\nconst x = 1;\nvoid x;\n';
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog], {
      reportUnusedSuppressions: true,
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('@aicq/unused-suppression');
    expect(result.diagnostics[0]?.range.start.line).toBe(1);
  });

  it('5. opt-in + partial match (two rule ids, one matched) — directive itself is considered used', () => {
    // `aicq-disable-next-line a, b` is a single directive. When at least one of its rule ids
    // matches a real violation on the next line, the directive as a whole is considered used —
    // even if the other id had no matching diagnostic. This is intentional: false negatives
    // here are safer than spamming info diagnostics on every `a, b` pair where only `a` fired.
    const src = "// aicq-disable-next-line no-console-log, no-magic-number\nconsole.log('x');\n";
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog], {
      reportUnusedSuppressions: true,
    });
    expect(result.diagnostics).toHaveLength(0);
  });

  it('6. opt-in + bare wildcard directive + zero diagnostics → unused diagnostic', () => {
    const src = '// aicq-disable-line\nconst x = 1;\nvoid x;\n';
    const result = runFileWithSource('src/app.ts', src, 'typescript', [noConsoleLog], {
      reportUnusedSuppressions: true,
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('@aicq/unused-suppression');
  });
});
