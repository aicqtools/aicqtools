import { describe, expect, it } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noConsoleLog from '../rules-default/no-console-log.js';
import noEmptyCatch from '../rules-default/no-empty-catch.js';
import noMagicNumber from '../rules-default/no-magic-number.js';

/**
 * Alpha.13 — `skipBuiltinSkips` escape hatch.
 *
 * Three built-in rules carry an internal `SKIP_FILE_RE` guard so they don't fire on
 * conventionally-skipped paths (`scripts/`, `native-bridge.js`, `__tests__/`, …).
 * With `skipBuiltinSkips: true` on the context, those guards must be bypassed.
 *
 * Item A — default (omitted opt) preserves alpha.10~12 behavior (back-compat regression guard).
 * Item B — `skipBuiltinSkips: true` makes the rule fire on the same fixture.
 */
describe('skipBuiltinSkips escape hatch — back-compat (item A, default off)', () => {
  it('no-console-log still skips files under scripts/', () => {
    const result = runFileWithSource(
      'src/scripts/build.ts',
      "console.log('x');\n",
      'typescript',
      [noConsoleLog],
    );
    expect(result.diagnostics).toHaveLength(0);
  });

  it('no-empty-catch still skips native-bridge.ts', () => {
    const result = runFileWithSource(
      'src/native-bridge.ts',
      'try { foo(); } catch (e) {}\nfunction foo() {}\n',
      'typescript',
      [noEmptyCatch],
    );
    expect(result.diagnostics).toHaveLength(0);
  });

  it('no-magic-number still skips files under __tests__/', () => {
    const result = runFileWithSource(
      'src/__tests__/util.test.ts',
      'function f(x: number) { return x * 7; }\nf(1);\n',
      'typescript',
      [noMagicNumber],
    );
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe('skipBuiltinSkips escape hatch — on (item B)', () => {
  it('no-console-log fires under scripts/ when skipBuiltinSkips is true', () => {
    const result = runFileWithSource(
      'src/scripts/build.ts',
      "console.log('x');\n",
      'typescript',
      [noConsoleLog],
      { skipBuiltinSkips: true },
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-console-log');
  });

  it('no-empty-catch fires on native-bridge.ts when skipBuiltinSkips is true', () => {
    const result = runFileWithSource(
      'src/native-bridge.ts',
      'try { foo(); } catch (e) {}\nfunction foo() {}\n',
      'typescript',
      [noEmptyCatch],
      { skipBuiltinSkips: true },
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-empty-catch');
  });

  it('no-magic-number fires under __tests__/ when skipBuiltinSkips is true', () => {
    const result = runFileWithSource(
      'src/__tests__/util.test.ts',
      'function f(x: number) { return x * 7; }\nf(1);\n',
      'typescript',
      [noMagicNumber],
      { skipBuiltinSkips: true },
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-magic-number');
  });
});
