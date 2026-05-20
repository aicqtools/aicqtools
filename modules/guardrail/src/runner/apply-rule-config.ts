import micromatch from 'micromatch';
import type { RuleEntry, RuleLevel, RuleOverride, Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { resolveRuleOptions, type UnknownRuleOption } from './resolve-rule-options.js';

/**
 * Resolution of `config.modules.guardrail.rules` (the `{ ruleId: RuleEntry }` map) against the
 * loaded rule set. Filters out `off`'d rules, overrides severity for `warn`/`error` entries,
 * resolves alpha.14 per-rule options, and reports unknown rule ids + unknown option keys back
 * to the caller so the CLI can warn the user once.
 */
export interface ApplyRuleConfigResult {
  readonly rules: readonly Rule[];
  /** Rule ids that appeared in the config map but matched no loaded rule. */
  readonly unknownIds: readonly string[];
  /** Alpha.14 — resolved per-rule options keyed by ruleId. Absent entries = no options. */
  readonly ruleOptions: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  /** Alpha.14 — unknown option keys per rule (typo surface). One entry per rule with typos. */
  readonly unknownOptions: readonly UnknownRuleOption[];
  /** Alpha.14 — zod schema parse failures keyed by ruleId (caller surfaces via stderr). */
  readonly optionParseErrors: ReadonlyMap<string, string>;
}

const LEVEL_TO_SEVERITY: Record<Exclude<RuleLevel, 'off'>, Severity> = {
  warn: 'warning',
  error: 'error',
};

function extractLevel(entry: RuleEntry): RuleLevel | undefined {
  if (typeof entry === 'string') return entry;
  return entry.severity;
}

function extractOptions(entry: RuleEntry): Readonly<Record<string, unknown>> | undefined {
  if (typeof entry === 'string') return undefined;
  return entry.options;
}

/**
 * Apply the user-supplied `rules:` map to a loaded rule list.
 *
 * - `off`        → drop the rule from the returned list
 * - `warn`/`error` → return a copy of the rule with `severity` overridden
 * - object shape (alpha.14) → optional `severity` override + optional `options` validated
 *   against the rule's own zod schema; resolved options attached via `ruleOptions` map.
 * - missing entry → rule passes through unchanged
 *
 * Map keys that don't correspond to any loaded rule are collected in `unknownIds`. Unknown
 * option keys (typos inside `options`) land in `unknownOptions`. Zod parse failures land in
 * `optionParseErrors` — the rule still runs with its `defaults`, never crashing the scan.
 */
export function applyRuleConfig(
  rules: readonly Rule[],
  cfgMap: Readonly<Record<string, RuleEntry>> | undefined,
): ApplyRuleConfigResult {
  if (!cfgMap || Object.keys(cfgMap).length === 0) {
    return {
      rules,
      unknownIds: [],
      ruleOptions: new Map(),
      unknownOptions: [],
      optionParseErrors: new Map(),
    };
  }
  const knownIds = new Set(rules.map((r) => r.id));
  const unknownIds: string[] = [];
  for (const id of Object.keys(cfgMap)) {
    if (!knownIds.has(id)) unknownIds.push(id);
  }
  const out: Rule[] = [];
  const ruleOptions = new Map<string, Readonly<Record<string, unknown>>>();
  const unknownOptions: UnknownRuleOption[] = [];
  const optionParseErrors = new Map<string, string>();
  for (const rule of rules) {
    const entry = cfgMap[rule.id];
    let nextRule: Rule = rule;
    if (entry !== undefined) {
      const level = extractLevel(entry);
      if (level === 'off') continue;
      if (level !== undefined) {
        const severity = LEVEL_TO_SEVERITY[level];
        if (severity) {
          // Discriminated union: re-spread per branch to preserve `kind` narrowing.
          if (rule.kind === 'function') {
            nextRule = { ...rule, severity };
          } else {
            nextRule = { ...rule, severity };
          }
        }
      }
      const userOptions = extractOptions(entry);
      const resolved = resolveRuleOptions(rule, userOptions);
      if (resolved.options !== undefined) {
        ruleOptions.set(rule.id, resolved.options);
      }
      if (resolved.unknownKeys.length > 0) {
        unknownOptions.push({ ruleId: rule.id, unknownKeys: resolved.unknownKeys });
      }
      if (resolved.parseError) {
        optionParseErrors.set(rule.id, resolved.parseError);
      }
    } else {
      // No config entry but rule may declare defaults — attach them so `ctx.options` works.
      const resolved = resolveRuleOptions(rule, undefined);
      if (resolved.options !== undefined) {
        ruleOptions.set(rule.id, resolved.options);
      }
    }
    out.push(nextRule);
  }
  return { rules: out, unknownIds, ruleOptions, unknownOptions, optionParseErrors };
}

/**
 * Auto-anchor a single `overrides.paths` glob (alpha.10).
 *
 * `fast-glob` returns absolute file paths, so a user-written `scripts/**` would silently never
 * match. We prepend `**\/` unless the glob already carries an anchor token, mirroring the
 * ESLint mental model where `paths: ['scripts/**']` means "any `scripts/` in the project":
 *
 * - leading `**` (with or without `/`) — already anchored, leave alone
 * - leading `/` — Unix absolute path, user opted out of auto-anchor
 * - leading `<letter>:/` — Windows drive path, same
 * - leading `!` — negation; preserve the marker, normalize the body
 *
 * The function is pure and never throws. Empty input returns empty.
 */
export function normalizeOverridePath(glob: string): string {
  if (!glob) return glob;
  let negation = '';
  let body = glob;
  if (body.startsWith('!')) {
    negation = '!';
    body = body.slice(1);
  }
  if (!body) return negation;
  if (body.startsWith('**')) return negation + body;
  if (body.startsWith('/')) return negation + body;
  if (/^[A-Za-z]:\//.test(body)) return negation + body;
  return negation + '**/' + body;
}

/**
 * Apply per-path `overrides` (alpha.8) on top of an already-globally-resolved rule list.
 *
 * For each override entry whose `paths` globs match `filePath`, merge its `rules` map into a
 * per-file effective entry map. Later matching entries win for the same rule id (ESLint semantics).
 * `off` drops the rule for this file; `warn`/`error` copies the rule with overridden severity.
 *
 * Alpha.14: override entries can also carry the object shape `{ severity?, options? }`. The
 * resolved options override the global ones for the matched files. The function returns an
 * augmented baseline-options map (cloned, never mutates the caller's map) so the runner can
 * thread the per-file options into `RuleContext.options`.
 *
 * Fast path: if no overrides are configured, returns the input list unchanged so the file loop
 * stays cheap when this feature is unused.
 *
 * Alpha.10: `paths` globs are auto-anchored via `normalizeOverridePath` so users can write
 * `scripts/**` instead of `**\/scripts/**` and get the expected ESLint semantics. When the
 * optional `matchCounts` array is provided, each matched override entry's slot is incremented;
 * the caller (CLI) reads zero-valued slots to emit "matched no files — ignored." warnings.
 */
/**
 * Alpha.8/10 signature — returns `readonly Rule[]`. Preserved verbatim for back-compat with
 * tests and external callers that don't need per-rule options. For runner usage (which threads
 * options into RuleContext), call `applyOverridesForFileResolved` instead.
 */
export function applyOverridesForFile(
  baselineRules: readonly Rule[],
  overrides: readonly RuleOverride[],
  filePath: string,
  matchCounts?: number[],
): readonly Rule[] {
  return applyOverridesForFileResolved(baselineRules, overrides, filePath, matchCounts).rules;
}

/**
 * Alpha.14 — extended return shape with per-rule resolved options. The runner calls this so
 * `RuleContext.options` reflects per-file overrides on top of the global baseline.
 */
export interface ApplyOverridesResult {
  readonly rules: readonly Rule[];
  /**
   * Per-rule resolved options for this file. Always returned (cloned from `baselineRuleOptions`
   * when no override matched, so callers can read it unconditionally).
   */
  readonly ruleOptions: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
}

export function applyOverridesForFileResolved(
  baselineRules: readonly Rule[],
  overrides: readonly RuleOverride[],
  filePath: string,
  matchCounts?: number[],
  baselineRuleOptions?: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): ApplyOverridesResult {
  const baselineOpts = baselineRuleOptions ?? new Map();
  if (overrides.length === 0) {
    return { rules: baselineRules, ruleOptions: baselineOpts };
  }
  const normalized = filePath.replace(/\\/g, '/');
  const effective = new Map<string, RuleEntry>();
  let anyMatch = false;
  for (let i = 0; i < overrides.length; i++) {
    const ov = overrides[i];
    if (!ov) continue;
    const paths = ov.paths.map(normalizeOverridePath);
    const matched =
      micromatch.isMatch(normalized, paths, { dot: true }) ||
      micromatch.isMatch(filePath, paths, { dot: true });
    if (!matched) continue;
    anyMatch = true;
    if (matchCounts) matchCounts[i] = (matchCounts[i] ?? 0) + 1;
    for (const [id, entry] of Object.entries(ov.rules)) {
      effective.set(id, entry);
    }
  }
  if (!anyMatch) return { rules: baselineRules, ruleOptions: baselineOpts };

  const ruleById = new Map(baselineRules.map((r) => [r.id, r]));
  const out: Rule[] = [];
  const perFileOpts = new Map(baselineOpts);
  for (const rule of baselineRules) {
    const entry = effective.get(rule.id);
    if (entry === undefined) {
      out.push(rule);
      continue;
    }
    const level = extractLevel(entry);
    if (level === 'off') {
      perFileOpts.delete(rule.id);
      continue;
    }
    let nextRule: Rule = rule;
    if (level !== undefined) {
      const severity = LEVEL_TO_SEVERITY[level];
      if (severity) {
        if (rule.kind === 'function') {
          nextRule = { ...rule, severity };
        } else {
          nextRule = { ...rule, severity };
        }
      }
    }
    const userOptions = extractOptions(entry);
    if (userOptions !== undefined) {
      const resolved = resolveRuleOptions(rule, userOptions);
      if (resolved.options !== undefined) {
        perFileOpts.set(rule.id, resolved.options);
      }
    }
    out.push(nextRule);
  }
  // Drop options for rules dropped from `out` (off'd by overrides).
  const finalIds = new Set(out.map((r) => r.id));
  for (const id of Array.from(perFileOpts.keys())) {
    if (!finalIds.has(id) && !ruleById.has(id)) perFileOpts.delete(id);
  }
  return { rules: out, ruleOptions: perFileOpts };
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

/**
 * Collect leading-`!` negation globs inside `overrides[i].paths` entries (alpha.11).
 *
 * Background: `applyOverridesForFile` matches a file via `micromatch.isMatch(file, paths)`, and
 * `isMatch` with an array uses any-match (OR) semantics. A `!vendor/**` entry in `paths` therefore
 * does NOT subtract from a sibling positive glob the way ESLint's `ignores` field would — it just
 * silently no-ops. The CLI emits one stderr warning per offending entry so the silent footgun
 * surfaces; users get pointed at the top-level `exclude:` field as the real opt-out path.
 */
export interface NegationOverridePath {
  readonly index: number;
  /** The negation globs found in this entry (leading `!` preserved). */
  readonly paths: readonly string[];
}

export function collectNegationPaths(
  overrides: readonly RuleOverride[],
): readonly NegationOverridePath[] {
  if (overrides.length === 0) return [];
  const out: NegationOverridePath[] = [];
  for (let i = 0; i < overrides.length; i++) {
    const ov = overrides[i];
    if (!ov) continue;
    const negations = ov.paths.filter((p) => p.startsWith('!'));
    if (negations.length > 0) out.push({ index: i, paths: negations });
  }
  return out;
}
