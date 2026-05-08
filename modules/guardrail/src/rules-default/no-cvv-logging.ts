import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS § 3.2: CVV/CVC must never be persisted or logged. Detect
 * `console.log` / `logger.*` / `winston.*` / `pino.*` calls whose
 * arguments reference a `cvv` / `cvc` identifier.
 *
 * Limitation: false positive when a variable is named `cvc` for unrelated
 * reasons.
 */
const LOGGER_FN = /^(console\.(log|info|warn|error|debug)|(logger|winston|pino|log)\.\w+)$/;
const CVV_PATTERN = /\b(cvv|cvc|cvv2|cardSecurityCode)\b/i;

export default defineRule({
  id: 'no-cvv-logging',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'CVV/CVC must not appear in log output (PCI DSS § 3.2).',
  messageKo: 'CVV/CVC를 로그에 기록할 수 없습니다 (PCI DSS § 3.2).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/no-cvv-logging.md',
  visitors: {
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      const fnText = ctx.textOf(fnNode);
      if (!LOGGER_FN.test(fnText)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      if (CVV_PATTERN.test(argsText)) ctx.report({ node });
    },
  },
});
