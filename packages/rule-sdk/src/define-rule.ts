import type { DefineRuleInput, FunctionRule } from './types.js';

export function defineRule(input: DefineRuleInput): FunctionRule {
  return { ...input, kind: 'function' };
}
