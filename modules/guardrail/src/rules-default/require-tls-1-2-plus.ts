import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS § 4.1: cardholder data in transit must use strong cryptography.
 * Detect TLS configuration that explicitly allows TLSv1 / TLSv1.1 via
 * `secureProtocol` or `minVersion` options.
 */
const FORBIDDEN_PROTO = /['"`](TLSv1(_method)?|TLSv1\.1|TLSv1_1(_method)?|SSLv\d|SSLv\d_method)['"`]/;

export default defineRule({
  id: 'require-tls-1-2-plus',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'TLS configuration allows TLS < 1.2 (PCI DSS § 4.2.1 — strong cryptography for cardholder data in transit).',
  messageKo: 'TLS 1.2 미만 프로토콜을 허용하는 설정 (PCI DSS § 4.2.1 — 카드 소지자 데이터 전송 시 강한 암호화 필수).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/require-tls-1-2-plus.md',
  visitors: {
    pair(node: Parser.SyntaxNode, ctx: RuleContext) {
      const key = node.childForFieldName('key');
      const value = node.childForFieldName('value');
      if (!key || !value) return;
      const keyText = ctx.textOf(key).replace(/^['"`]|['"`]$/g, '');
      if (keyText !== 'secureProtocol' && keyText !== 'minVersion') return;
      const valueText = ctx.textOf(value);
      if (FORBIDDEN_PROTO.test(valueText)) ctx.report({ node });
    },
  },
});
