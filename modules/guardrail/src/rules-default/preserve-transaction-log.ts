import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS § 10: financial transactions must produce an audit trail.
 * Detect functions named pay/charge/payment/refund that lack any logging
 * or transaction-table write call in their body.
 */
const TX_NAME = /^(pay|charge|payment|refund|cancelRefund|issueRefund|pay\w*|charge\w*|payment\w*|refund\w*)$/;
const LOG_OR_AUDIT = /\b(logger|auditLog|audit|winston|pino)\.\w+|\bconsole\.(log|info|warn|error)|\b(transactions|payment_log|paymentLogs|auditLogs|tx_log)\b.*\.(insert|create|save|push)/;

function check(node: Parser.SyntaxNode, ctx: RuleContext): void {
  const name = node.childForFieldName('name');
  if (!name) return;
  const fnName = ctx.textOf(name);
  if (!TX_NAME.test(fnName)) return;
  const text = ctx.textOf(node);
  if (LOG_OR_AUDIT.test(text)) return;
  ctx.report({ node });
}

export default defineRule({
  id: 'preserve-transaction-log',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'Payment/refund function does not produce an audit log entry — PCI DSS § 10.',
  messageKo: '결제/환불 함수에 감사 로그 기록이 없습니다 — PCI DSS § 10 위반.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/preserve-transaction-log.md',
  visitors: {
    function_declaration: check,
    method_definition: check,
  },
});
