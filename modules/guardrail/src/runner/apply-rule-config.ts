import micromatch from 'micromatch';
import type { RuleOverride, Severity } from '@aicqtools/core';
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

/**
 * Apply per-path `overrides` (alpha.8) on top of an already-globally-resolved rule list.
 *
 * For each override entry whose `paths` globs match `filePath`, merge its `rules` map into a
 * per-file effective level map. Later matching entries win for the same rule id (ESLint semantics).
 * `off` drops the rule for this file; `warn`/`error` copies the rule with overridden severity.
 *
 * Fast path: if no overrides are configured, returns the input list unchanged so the file loop
 * stays cheap when this feature is unused.
 */
export function applyOverridesForFile(
  baselineRules: readonly Rule[],
  overrides: readonly RuleOverride[],
  filePath: string,
): readonly Rule[] {
  if (overrides.length === 0) return baselineRules;
  const normalized = filePath.replace(/\\/g, '/');
  const effective = new Map<string, RuleLevel>();
  let anyMatch = false;
  for (const ov of overrides) {
    const paths = [...ov.paths];
    const matched =
      micromatch.isMatch(normalized, paths, { dot: true }) ||
      micromatch.isMatch(filePath, paths, { dot: true });
    if (!matched) continue;
    anyMatch = true;
    for (const [id, level] of Object.entries(ov.rules)) {
      effective.set(id, level);
    }
  }
  if (!anyMatch) return baselineRules;
  const out: Rule[] = [];
  for (const rule of baselineRules) {
    const level = effective.get(rule.id);
    if (level === undefined) {
      out.push(rule);
      continue;
    }
    if (level === 'off') continue;
    const severity = LEVEL_TO_SEVERITY[level];
    if (!severity) {
      out.push(rule);
      continue;
    }
    if (rule.kind === 'function') {
      out.push({ ...rule, severity });
    } else {
      out.push({ ...rule, severity });
    }
  }
  return out;
}

/**
 * Collect rule ids referenced by `overrides` entries that don't match any loaded rule, paired
 * with the index of the offending override entry. The caller (CLI) uses these to emit one
 * stderr warning per typo so configuration mistakes surface early rather than silently no-op'ing.
 */
export interface UnknownOverrideId {
  readonly index: number;
  readonly id: string;
  readonly paths: readonly string[];
}

export function collectUnknownOverrideIds(
  baselineRules: readonly Rule[],
  overrides: readonly RuleOverride[],
): readonly UnknownOverrideId[] {
  if (overrides.length === 0) return [];
  const knownIds = new Set(baselineRules.map((r) => r.id));
  const out: UnknownOverrideId[] = [];
  for (let i = 0; i < overrides.length; i++) {
    const ov = overrides[i];
    if (!ov) continue;
    for (const id of Object.keys(ov.rules)) {
      if (!knownIds.has(id)) out.push({ index: i, id, paths: ov.paths });
    }
  }
  return out;
}
