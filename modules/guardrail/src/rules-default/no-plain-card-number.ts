import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * PCI DSS: card numbers (PAN) must never be stored in plaintext columns.
 * Detect Sequelize/Prisma/TypeORM-style schema definitions where a column
 * named `card_number` / `cardNumber` is declared with a plain string type
 * and no encryption/hash suffix in the column name.
 *
 * Limitation: pattern-based — does not understand custom encryption
 * wrappers. Severity stays at `error` because the cost of a false positive
 * (rename column) is far smaller than the cost of a true positive.
 */
const PAYMENT_NAME = /^(card[_-]?number|pan|primary[_-]?account[_-]?number)$/i;
const ENCRYPTED_HINT = /(encrypted|hashed|tokenized|masked|encr|hash)/i;

export default defineRule({
  id: 'no-plain-card-number',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'Card number column appears to be stored in plaintext — PCI DSS requires encryption or tokenization.',
  messageKo: '카드번호 컬럼이 평문으로 저장되는 것으로 보입니다 — PCI DSS 요건상 암호화/토큰화 필수.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/no-plain-card-number.md',
  visitors: {
    pair(node: Parser.SyntaxNode, ctx: RuleContext) {
      const key = node.childForFieldName('key');
      if (!key) return;
      const keyText = ctx.textOf(key).replace(/^['"`]|['"`]$/g, '');
      if (!PAYMENT_NAME.test(keyText)) return;
      const value = node.childForFieldName('value');
      if (!value) return;
      const valueText = ctx.textOf(value);
      if (ENCRYPTED_HINT.test(valueText)) return;
      ctx.report({ node });
    },
    property_signature(node: Parser.SyntaxNode, ctx: RuleContext) {
      const name = node.childForFieldName('name');
      if (!name) return;
      const text = ctx.textOf(name);
      if (!PAYMENT_NAME.test(text)) return;
      const full = ctx.textOf(node);
      if (ENCRYPTED_HINT.test(full)) return;
      ctx.report({ node });
    },
  },
});
