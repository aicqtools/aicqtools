import { describe, expect, it } from 'vitest';
import { parseYamlRule } from '../matcher/yaml-rule.js';
import { applyRuleConfig } from '../runner/apply-rule-config.js';

const YAML_WITHOUT_OPTIONS = `
id: no-print-bare
language: python
severity: warning
message: avoid print
query: |
  (call
    function: (identifier) @fn
    (#eq? @fn "print")) @call
`;

const YAML_WITH_OPTIONS = `
id: no-print-with-opts
language: python
severity: warning
message: avoid print
options:
  defaults:
    disallowedFunctions:
      - print
      - pprint
query: |
  (call
    function: (identifier) @fn
    (#eq? @fn "print")) @call
`;

/**
 * Alpha.18 — YAML PatternRule 옵션 framework 편입. Covers:
 *   1. options 없는 YAML rule → rule.options === undefined (back-compat)
 *   2. options 있는 YAML rule → schema + defaults attach
 *   3. config override → applyRuleConfig resolve 통과 (FunctionRule과 동등)
 *   4. unknown option key → unknownOptions에 수집 (strict schema 동작)
 */
describe('YAML PatternRule options framework (alpha.18)', () => {
  it('1. YAML rule without options field → rule.options is undefined (back-compat)', () => {
    const rule = parseYamlRule(YAML_WITHOUT_OPTIONS);
    expect(rule.kind).toBe('pattern');
    expect(rule.options).toBeUndefined();
  });

  it('2. YAML rule with options field → rule.options has schema + defaults attached', () => {
    const rule = parseYamlRule(YAML_WITH_OPTIONS);
    expect(rule.kind).toBe('pattern');
    expect(rule.options).toBeDefined();
    expect(rule.options?.defaults).toEqual({ disallowedFunctions: ['print', 'pprint'] });
    expect(rule.options?.schema).toBeDefined();
  });

  it('3. config override on YAML rule resolves through applyRuleConfig (PatternRule = FunctionRule treatment)', () => {
    const rule = parseYamlRule(YAML_WITH_OPTIONS);
    const { ruleOptions } = applyRuleConfig([rule], {
      'no-print-with-opts': { options: { disallowedFunctions: ['log'] } },
    });
    const opts = ruleOptions.get('no-print-with-opts') as
      | { disallowedFunctions: readonly string[] }
      | undefined;
    expect(opts?.disallowedFunctions).toEqual(['log']);
  });

  it('4. unknown option key on YAML rule → collected in unknownOptions (strict schema)', () => {
    const rule = parseYamlRule(YAML_WITH_OPTIONS);
    const { unknownOptions } = applyRuleConfig([rule], {
      'no-print-with-opts': {
        options: { disallowedFunctionz: ['x'] } as unknown as Record<string, unknown>,
      },
    });
    expect(unknownOptions).toHaveLength(1);
    expect(unknownOptions[0]?.ruleId).toBe('no-print-with-opts');
    expect(unknownOptions[0]?.unknownKeys).toContain('disallowedFunctionz');
  });
});
