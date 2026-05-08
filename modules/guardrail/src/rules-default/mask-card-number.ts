import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS § 3.3: when a PAN is displayed it must be masked. Detect raw
 * `cardNumber` / `card_number` references inside `JSON.stringify(...)`,
 * template literals, or string concatenations without an accompanying
 * mask helper (`mask`, `redact`, `truncate`).
 */
const CARD_VAR = /\b(cardNumber|card_number|pan)\b/;
const MASK_HELPER = /\b(mask|redact|truncate|last4|maskCard)\w*\(/;

export default defineRule({
  id: 'mask-card-number',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'Card number is rendered without masking — PCI DSS § 3.3.',
  messageKo: '카드번호가 마스킹 없이 표시됩니다 — PCI DSS § 3.3.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/mask-card-number.md',
  visitors: {
    template_string(node: Parser.SyntaxNode, ctx: RuleContext) {
      const text = ctx.textOf(node);
      if (!CARD_VAR.test(text)) return;
      if (MASK_HELPER.test(text)) return;
      ctx.report({ node });
    },
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      const fnText = ctx.textOf(fn);
      if (fnText !== 'JSON.stringify') return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      if (!CARD_VAR.test(argsText)) return;
      if (MASK_HELPER.test(argsText)) return;
      ctx.report({ node });
    },
  },
});
