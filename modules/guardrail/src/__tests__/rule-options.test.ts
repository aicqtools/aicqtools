import { describe, expect, it } from 'vitest';
import type { Rule } from '@aicqtools/rule-sdk';
import { applyOverridesForFileResolved, applyRuleConfig } from '../runner/apply-rule-config.js';
import { resolveRuleOptions } from '../runner/resolve-rule-options.js';
import { runFileWithSource } from '../runner/run-file.js';
import noMagicNumber from '../rules-default/no-magic-number.js';
import noConsoleLog from '../rules-default/no-console-log.js';
import noEmptyCatch from '../rules-default/no-empty-catch.js';

/**
 * Alpha.14 — per-rule options framework. Covers:
 *   A. rules without an `options` declaration → ctx.options === undefined (back-compat)
 *   B. `no-magic-number` defaults → identical alpha.13 behavior (regression guard)
 *   C. `no-magic-number` with `allowedNumbers: ['7', '13']` → 16 becomes a violation
 *   D. zod schema violation (wrong type) → defaults fallback + parseError surfaced
 *   E. unknown option keys → collected in `unknownOptions`, exit code unchanged
 *   F. overrides layering — per-file options override global options
 */

describe('per-rule options framework (alpha.14)', () => {
  it('A. rules without an options declaration are unaffected', () => {
    // no-console-log has no `options` field. Calling runFileWithSource without ruleOptions
    // must behave exactly as alpha.13 (rule fires on app.ts).
    const result = runFileWithSource(
      'src/app.ts',
      "console.log('x');\n",
      'typescript',
      [noConsoleLog],
    );
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-console-log');
  });

  it('B. no-magic-number defaults reproduce alpha.13 behavior (regression guard)', () => {
    // The default allowedNumbers list includes '16'. Without any options config, an inline 16
    // must NOT be reported (this is the alpha.13 baseline that dogfood counts depend on).
    const result = runFileWithSource(
      'src/util.ts',
      'function f(x: number) { return x * 16; }\nf(1);\n',
      'typescript',
      [noMagicNumber],
    );
    expect(result.diagnostics).toHaveLength(0);
  });

  it('C. allowedNumbers shrunk to [7, 13] makes 16 a violation', () => {
    // applyRuleConfig with an object-shape entry should attach the resolved options to the
    // rule-options map, which runFileWithSource then threads into ctx.options.
    const { rules: effective, ruleOptions } = applyRuleConfig([noMagicNumber], {
      'no-magic-number': { options: { allowedNumbers: ['7', '13'] } },
    });
    expect(ruleOptions.has('no-magic-number')).toBe(true);

    const result = runFileWithSource(
      'src/util.ts',
      'function f(x: number) { return x * 16; }\nf(1);\n',
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-magic-number');
  });

  it('D. zod schema violation falls back to defaults + reports parseError', () => {
    // Wrong type for allowedNumbers (should be string[]) must NOT crash the run — runner
    // applies defaults and surfaces the error so the CLI can stderr-log it.
    const resolved = resolveRuleOptions(noMagicNumber, { allowedNumbers: 'not-array' as unknown as string[] });
    expect(resolved.parseError).toBeDefined();
    expect(resolved.options?.allowedNumbers).toEqual(noMagicNumber.options?.defaults.allowedNumbers);
  });

  it('E. unknown option keys are collected as typo surface (exit unchanged)', () => {
    const { unknownOptions } = applyRuleConfig([noMagicNumber], {
      'no-magic-number': { options: { allowedNumberz: ['7'] } as unknown as Record<string, unknown> },
    });
    expect(unknownOptions).toHaveLength(1);
    expect(unknownOptions[0]?.ruleId).toBe('no-magic-number');
    expect(unknownOptions[0]?.unknownKeys).toContain('allowedNumberz');
  });

  it('F. overrides layering — per-file options override the global options', () => {
    // Global: allowedNumbers: ['16']. Override for src/scripts/**: ['7'].
    // For a file under src/scripts/, 7 should be allowed (matches override) but 16 should fire.
    const { rules: effective, ruleOptions: globalOpts } = applyRuleConfig([noMagicNumber], {
      'no-magic-number': { options: { allowedNumbers: ['16'] } },
    });
    const overrideResult = applyOverridesForFileResolved(
      effective,
      [
        {
          paths: ['**/src/scripts/**'],
          rules: { 'no-magic-number': { options: { allowedNumbers: ['7'] } } },
        },
      ],
      'D:/proj/src/scripts/util.ts',
      undefined,
      globalOpts,
    );
    const perFileOpts = overrideResult.ruleOptions.get('no-magic-number') as
      | { allowedNumbers: readonly string[] }
      | undefined;
    expect(perFileOpts?.allowedNumbers).toEqual(['7']);
  });

  it('G. three rules with options simultaneously resolve via one applyRuleConfig call (alpha.15)', () => {
    const { ruleOptions } = applyRuleConfig(
      [noMagicNumber, noConsoleLog, noEmptyCatch],
      {
        'no-magic-number': { options: { allowedNumbers: ['7'] } },
        'no-console-log': { options: { flagMethods: ['log', 'debug'] } },
        'no-empty-catch': { options: { skipFilePatterns: ['[/\\\\]sandbox\\.ts$'] } },
      },
    );
    expect(ruleOptions.size).toBe(3);
    expect((ruleOptions.get('no-magic-number') as { allowedNumbers: string[] })?.allowedNumbers).toEqual([
      '7',
    ]);
    expect((ruleOptions.get('no-console-log') as { flagMethods: string[] })?.flagMethods).toEqual([
      'log',
      'debug',
    ]);
    expect(
      (ruleOptions.get('no-empty-catch') as { skipFilePatterns: string[] })?.skipFilePatterns,
    ).toEqual(['[/\\\\]sandbox\\.ts$']);
  });

  it('H. unknown option keys across two rules are each reported with their ruleId (alpha.15)', () => {
    const { unknownOptions } = applyRuleConfig([noConsoleLog, noEmptyCatch], {
      'no-console-log': {
        options: { flagMethodz: ['x'] } as unknown as Record<string, unknown>,
      },
      'no-empty-catch': {
        options: { skipFilePatternz: ['y'] } as unknown as Record<string, unknown>,
      },
    });
    expect(unknownOptions).toHaveLength(2);
    const byId = new Map(unknownOptions.map((u) => [u.ruleId, u.unknownKeys]));
    expect(byId.get('no-console-log')).toContain('flagMethodz');
    expect(byId.get('no-empty-catch')).toContain('skipFilePatternz');
  });
});
