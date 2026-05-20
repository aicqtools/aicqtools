import { describe, expect, it } from 'vitest';
import { applyRuleConfig } from '../runner/apply-rule-config.js';
import { runFileWithSource } from '../runner/run-file.js';
import noEmptyCatch from '../rules-default/no-empty-catch.js';

const EMPTY_CATCH_SRC = 'try { foo(); } catch (e) {}\nfunction foo() {}\n';

/**
 * Alpha.15 — `no-empty-catch.skipFilePatterns` migration. Covers:
 *   4. defaults → alpha.14 behavior (native-bridge skipped) — regression guard
 *   5. user-supplied skipFilePatterns overrides defaults entirely (custom-skip.ts skipped,
 *      native-bridge.ts no longer skipped)
 *   6. `skipBuiltinSkips: true` short-circuits BOTH default and user skip patterns (plan
 *      decision #4 — global escape hatch precedence)
 */
describe('no-empty-catch — alpha.15 skipFilePatterns option', () => {
  it('4. defaults reproduce alpha.14 behavior — native-bridge.ts still auto-skipped', () => {
    const result = runFileWithSource(
      'src/native-bridge.ts',
      EMPTY_CATCH_SRC,
      'typescript',
      [noEmptyCatch],
    );
    expect(result.diagnostics).toHaveLength(0);
  });

  it('5. user skipFilePatterns overrides defaults — custom-skip.ts skipped, native-bridge.ts fires', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noEmptyCatch], {
      'no-empty-catch': { options: { skipFilePatterns: ['[/\\\\]custom-skip\\.ts$'] } },
    });
    const customSkipResult = runFileWithSource(
      'src/custom-skip.ts',
      EMPTY_CATCH_SRC,
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(customSkipResult.diagnostics).toHaveLength(0);

    const nativeBridgeResult = runFileWithSource(
      'src/native-bridge.ts',
      EMPTY_CATCH_SRC,
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(nativeBridgeResult.diagnostics).toHaveLength(1);
    expect(nativeBridgeResult.diagnostics[0]?.ruleId).toBe('no-empty-catch');
  });

  it('6. skipBuiltinSkips=true short-circuits both default and user skip patterns', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noEmptyCatch], {
      'no-empty-catch': { options: { skipFilePatterns: ['[/\\\\]custom-skip\\.ts$'] } },
    });
    const opts = { ruleOptions, skipBuiltinSkips: true };
    const customSkipResult = runFileWithSource(
      'src/custom-skip.ts',
      EMPTY_CATCH_SRC,
      'typescript',
      effective,
      opts,
    );
    const nativeBridgeResult = runFileWithSource(
      'src/native-bridge.ts',
      EMPTY_CATCH_SRC,
      'typescript',
      effective,
      opts,
    );
    expect(customSkipResult.diagnostics).toHaveLength(1);
    expect(nativeBridgeResult.diagnostics).toHaveLength(1);
  });
});
