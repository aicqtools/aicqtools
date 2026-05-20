import type { Rule } from '@aicqtools/rule-sdk';

/**
 * Alpha.14 — per-rule options framework.
 *
 * `resolveRuleOptions(rule, userOptions)`:
 *   1. Rule with no `options` declaration → returns `{ options: undefined }`.
 *   2. Rule has options but user supplied none → returns the rule's `defaults`.
 *   3. Rule has options + user supplied some → merges `{ ...defaults, ...user }`, runs the
 *      rule's zod schema in `safeParse` mode, and:
 *        - on success: returns parsed data + any unknown keys the user supplied that are not
 *          in `defaults` (typo surface).
 *        - on failure: returns `defaults` as a safe fallback + the zod error message + any
 *          unknown keys. The caller surfaces the error via stderr; the rule keeps running.
 *
 * The runner never throws when option resolution fails — guardrail's job is to keep scanning
 * even when one rule's config is broken (mirrors alpha.7's "unknown rule id ignored" pattern).
 */

export interface UnknownRuleOption {
  readonly ruleId: string;
  readonly unknownKeys: readonly string[];
}

export interface ResolveRuleOptionsResult {
  readonly options: Readonly<Record<string, unknown>> | undefined;
  readonly unknownKeys: readonly string[];
  readonly parseError?: string;
}

export function resolveRuleOptions(
  rule: Rule,
  userOptions: Readonly<Record<string, unknown>> | undefined,
): ResolveRuleOptionsResult {
  if (!rule.options) {
    return { options: undefined, unknownKeys: [] };
  }
  if (!userOptions || Object.keys(userOptions).length === 0) {
    return { options: rule.options.defaults, unknownKeys: [] };
  }

  const knownKeys = new Set(Object.keys(rule.options.defaults));
  const unknownKeys = Object.keys(userOptions).filter((k) => !knownKeys.has(k));

  const merged = { ...rule.options.defaults, ...userOptions };
  const parsed = rule.options.schema.safeParse(merged);
  if (parsed.success) {
    return {
      options: parsed.data as Readonly<Record<string, unknown>>,
      unknownKeys,
    };
  }

  const parseError = parsed.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return {
    options: rule.options.defaults,
    unknownKeys,
    parseError,
  };
}
