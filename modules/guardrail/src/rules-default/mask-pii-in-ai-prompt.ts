import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: personal information (RRN, card number) must be masked
 * before being passed to AI providers. Detect literal Korean RRN patterns
 * (\d{6}-\d{7}) or 16-digit card numbers in string/template arguments of
 * AI SDK calls.
 *
 * Limitation: false negatives if PII enters via interpolated variables;
 * false positives if a legitimate test fixture contains a digit run.
 */
const RRN_PATTERN = /\b\d{6}-\d{7}\b/;
const CARD_PATTERN = /\b(?:\d[ -]?){15,16}\b/;
const AI_CALL = /\b(openai|anthropic|aiClient)\.\w+/;

function inspectArgsString(text: string): boolean {
  return RRN_PATTERN.test(text) || CARD_PATTERN.test(text);
}

export default defineRule({
  id: 'mask-pii-in-ai-prompt',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'AI prompt contains unmasked PII (Korean RRN or card number) — mask before sending (FSC AI guideline — privacy protection).',
  messageKo: 'AI 프롬프트에 마스킹되지 않은 개인정보(주민번호/카드번호)가 포함되어 있습니다 — AI 호출 전 마스킹 필수 (금감원 AI 가이드라인 — 개인정보 보호).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/mask-pii-in-ai-prompt.md',
  visitors: {
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      const fnText = ctx.textOf(fnNode);
      if (!AI_CALL.test(fnText)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      if (inspectArgsString(argsText)) ctx.report({ node });
    },
  },
});
