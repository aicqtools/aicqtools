import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * Payment best practice: charge/pay/refund operations must include an
 * idempotency key to prevent double-spend on retry. Detect functions whose
 * name contains `pay` / `charge` / `payment` and which lack an
 * `idempotencyKey` / `Idempotency-Key` reference in the body.
 *
 * Limitation: name-based detection — functions named differently
 * (`processOrder`, `bill`, etc.) are not flagged.
 */
const PAYMENT_NAME = /^(pay|charge|payment|chargePayment|pay\w*|charge\w*|payment\w*|process(Pay|Payment|Charge))$/;
const IDEMPOTENCY = /\b(idempotency[_-]?key|idempotencyKey|Idempotency-Key)\b/i;

export default defineRule({
  id: 'require-idempotency-key',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'Payment function missing an idempotency key — required to prevent double-charge on retry (payment-domain best practice; aligns with PCI DSS § 10.2 audit trail integrity).',
  messageKo: '결제 함수에 idempotency key 누락 — 재시도 시 중복 청구 방지 필수 (결제 도메인 권장 사항; PCI DSS § 10.2 감사 추적 무결성 정렬).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/require-idempotency-key.md',
  visitors: {
    function_declaration(node: Parser.SyntaxNode, ctx: RuleContext) {
      const name = node.childForFieldName('name');
      if (!name) return;
      const fnName = ctx.textOf(name);
      if (!PAYMENT_NAME.test(fnName)) return;
      const text = ctx.textOf(node);
      if (IDEMPOTENCY.test(text)) return;
      ctx.report({ node });
    },
    method_definition(node: Parser.SyntaxNode, ctx: RuleContext) {
      const name = node.childForFieldName('name');
      if (!name) return;
      const fnName = ctx.textOf(name);
      if (!PAYMENT_NAME.test(fnName)) return;
      const text = ctx.textOf(node);
      if (IDEMPOTENCY.test(text)) return;
      ctx.report({ node });
    },
  },
});
