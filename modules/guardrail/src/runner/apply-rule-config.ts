import type { Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';

/**
 * Resolution of `config.modules.guardrail.rules` (the `{ ruleId: 'off' | 'warn' | 'error' }` map)
 * against the loaded rule set. Filters out `off`'d rules, overrides severity for `warn`/`error`
 * entries, and reports unknown rule ids back to the caller so the CLI can warn the user once.
 */
export interface ApplyRuleConfigResult {
  readonly rules: readonly Rule[];
  /** rule ids that appeared in the config map but matched no loaded rule */
  readonly unknownIds: readonly string[];
}

type RuleLevel = 'off' | 'warn' | 'error';
const LEVEL_TO_SEVERITY: Record<Exclude<RuleLevel, 'off'>, Severity> = {
  warn: 'warning',
  error: 'error',
};

/**
 * Apply the user-supplied `rules:` map to a loaded rule list.
 *
 * - `off`        → drop the rule from the returned list
 * - `warn`/`error` → return a copy of the rule with `severity` overridden
 * - missing entry → rule passes through unchanged
 *
 * Map keys that don't correspond to any loaded rule are collected in `unknownIds`. The function
 * never throws; an invalid level value (should already be rejected by zod) is treated as "no
 * override" rather than crashing the run.
 */
export function applyRuleConfig(
  rules: readonly Rule[],
  cfgMap: Readonly<Record<string, RuleLevel>> | undefined,
): ApplyRuleConfigResult {
  if (!cfgMap || Object.keys(cfgMap).length === 0) {
    return { rules, unknownIds: [] };
  }
  const knownIds = new Set(rules.map((r) => r.id));
  const unknownIds: string[] = [];
  for (const id of Object.keys(cfgMap)) {
    if (!knownIds.has(id)) unknownIds.push(id);
  }
  const out: Rule[] = [];
  for (const rule of rules) {
    const level = cfgMap[rule.id];
    if (level === undefined) {
      out.push(rule);
      continue;
    }
    if (level === 'off') continue;
    const severity = LEVEL_TO_SEVERITY[level];
    if (!severity) {
      // Unrecognized level — treat as no override, never crash.
      out.push(rule);
      continue;
    }
    // Copy with overridden severity. `Rule` is a discriminated union; preserve the union
    // by re-spreading per branch.
    if (rule.kind === 'function') {
      out.push({ ...rule, severity });
    } else {
      out.push({ ...rule, severity });
    }
  }
  return { rules: out, unknownIds };
}
