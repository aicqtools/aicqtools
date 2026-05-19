import { describe, expect, it } from 'vitest';
import type { Rule } from '@aicqtools/rule-sdk';
import { applyRuleConfig } from '../runner/apply-rule-config.js';

function fakeRule(id: string, severity: Rule['severity']): Rule {
  return {
    kind: 'function',
    id,
    language: 'typescript',
    severity,
    message: id,
    visitors: {},
  };
}

describe('applyRuleConfig', () => {
  const rules: readonly Rule[] = [
    fakeRule('alpha', 'error'),
    fakeRule('beta', 'warning'),
    fakeRule('gamma', 'info'),
  ];

  it('passes rules through unchanged when the map is empty', () => {
    const out = applyRuleConfig(rules, {});
    expect(out.rules).toEqual(rules);
    expect(out.unknownIds).toEqual([]);
  });

  it('passes rules through unchanged when the map is undefined', () => {
    const out = applyRuleConfig(rules, undefined);
    expect(out.rules).toEqual(rules);
    expect(out.unknownIds).toEqual([]);
  });

  it('drops a rule whose config level is `off`', () => {
    const out = applyRuleConfig(rules, { beta: 'off' });
    const ids = out.rules.map((r) => r.id);
    expect(ids).toEqual(['alpha', 'gamma']);
    expect(out.unknownIds).toEqual([]);
  });

  it('upgrades severity when level is `error`', () => {
    const out = applyRuleConfig(rules, { gamma: 'error' });
    const gamma = out.rules.find((r) => r.id === 'gamma');
    expect(gamma?.severity).toBe('error');
  });

  it('downgrades severity when level is `warn`', () => {
    const out = applyRuleConfig(rules, { alpha: 'warn' });
    const alpha = out.rules.find((r) => r.id === 'alpha');
    expect(alpha?.severity).toBe('warning');
  });

  it('collects unknown rule ids without dropping known rules', () => {
    const out = applyRuleConfig(rules, { 'no-such-rule': 'off', 'typo-rule': 'warn' });
    expect(out.rules).toEqual(rules);
    expect(new Set(out.unknownIds)).toEqual(new Set(['no-such-rule', 'typo-rule']));
  });

  it('preserves the discriminated `kind` after severity override', () => {
    const out = applyRuleConfig(rules, { alpha: 'warn' });
    const alpha = out.rules.find((r) => r.id === 'alpha');
    expect(alpha?.kind).toBe('function');
  });

  it('does not crash on a rule that appears multiple times in the input list', () => {
    const dup = [...rules, fakeRule('alpha', 'info')];
    const out = applyRuleConfig(dup, { alpha: 'warn' });
    const alphas = out.rules.filter((r) => r.id === 'alpha');
    expect(alphas).toHaveLength(2);
    expect(alphas.every((r) => r.severity === 'warning')).toBe(true);
  });

  it('alpha.14 union shape: object entry with only severity behaves like the legacy string', () => {
    const out = applyRuleConfig(rules, { alpha: { severity: 'warn' } });
    const alpha = out.rules.find((r) => r.id === 'alpha');
    expect(alpha?.severity).toBe('warning');
  });

  it('alpha.14 back-compat: legacy `off` string keeps dropping the rule', () => {
    const out = applyRuleConfig(rules, { gamma: 'off' });
    const ids = out.rules.map((r) => r.id);
    expect(ids).toEqual(['alpha', 'beta']);
  });
});
