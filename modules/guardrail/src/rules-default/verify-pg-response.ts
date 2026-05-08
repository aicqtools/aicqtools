import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS / payment-domain best practice: external PG (payment gateway)
 * responses must be verified (signature/hash/checksum) before being
 * trusted for downstream state changes.
 *
 * Heuristic: function bodies that contain a PG-domain HTTP call
 * (`/payments`, `/pay`, `pg.`) and proceed without invoking
 * `signature` / `hash` / `checksum` / `verify`.
 *
 * Limitation: false negatives if verification is delegated to a wrapper
 * function. Severity is `warning` to limit noise.
 */
const PG_CALL = /\b(axios|fetch|got|http\.(get|post)|httpClient)\b.*\b(payments?|pg|inicis|toss|kakao|naver)\b/i;
const VERIFICATION = /\b(signature|hash|checksum|verify|hmac|hmacSha)\b/i;

function check(node: Parser.SyntaxNode, ctx: RuleContext): void {
  const text = ctx.textOf(node);
  if (!PG_CALL.test(text)) return;
  if (VERIFICATION.test(text)) return;
  ctx.report({ node });
}

export default defineRule({
  id: 'verify-pg-response',
  language: ['typescript', 'tsx'],
  severity: 'warning',
  message: 'Payment gateway response is consumed without signature/hash verification.',
  messageKo: '결제 게이트웨이 응답을 서명/해시 검증 없이 사용합니다.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/verify-pg-response.md',
  visitors: {
    function_declaration: check,
    arrow_function: check,
    method_definition: check,
  },
});
