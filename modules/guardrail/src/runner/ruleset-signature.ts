import type { Rule } from '@aicq/rule-sdk';

export function ruleSignature(rule: Rule): string {
  if (rule.kind === 'pattern') {
    return `pattern:${rule.id}:${rule.severity}:${rule.query}`;
  }
  const visitorKeys = Object.keys(rule.visitors).sort().join(',');
  return `function:${rule.id}:${rule.severity}:${visitorKeys}`;
}

export function rulesetSignature(rules: readonly Rule[]): string[] {
  return rules.map(ruleSignature);
}
