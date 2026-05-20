import { describe, expect, it } from 'vitest';
import { applyRuleConfig } from '../runner/apply-rule-config.js';
import { runFileWithSource } from '../runner/run-file.js';
import noConsoleLog from '../rules-default/no-console-log.js';

/**
 * Alpha.15 — `no-console-log.flagMethods` migration. Covers:
 *   1. defaults → alpha.14 behavior (`console.log` flagged, others ignored) — regression guard
 *   2. `flagMethods: ['log', 'debug']` → both flagged
 *   3. `flagMethods: []` → intentional mute (no console.* flagged, even `console.log`)
 */
describe('no-console-log — alpha.15 flagMethods option', () => {
  it('1. defaults reproduce alpha.14 behavior — console.log flagged, console.debug ignored', () => {
    const result = runFileWithSource(
      'src/app.ts',
      "console.log('x'); console.debug('y');\n",
      'typescript',
      [noConsoleLog],
    );
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-console-log');
  });

  it('2. flagMethods: [log, debug] catches both console.log and console.debug', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noConsoleLog], {
      'no-console-log': { options: { flagMethods: ['log', 'debug'] } },
    });
    const result = runFileWithSource(
      'src/app.ts',
      "console.log('x'); console.debug('y'); console.info('z');\n",
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics.every((d) => d.ruleId === 'no-console-log')).toBe(true);
  });

  it('3. flagMethods: [] intentionally mutes the rule for every console method', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noConsoleLog], {
      'no-console-log': { options: { flagMethods: [] } },
    });
    const result = runFileWithSource(
      'src/app.ts',
      "console.log('x'); console.debug('y');\n",
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(result.diagnostics).toHaveLength(0);
  });
});
