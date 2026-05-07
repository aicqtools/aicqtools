import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * `toLocaleString()` / `toLocaleDateString()` without explicit timezone option
 * defaults to the runtime's local zone — non-deterministic in CI / serverless.
 * Korean projects should pass `{ timeZone: 'Asia/Seoul' }`.
 *
 * Known limitation: doesn't catch indirect calls (e.g., via a wrapper function).
 */
const LOCALE_METHODS = new Set([
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
]);

function hasTimezoneOption(args: Parser.SyntaxNode | null, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (!args) return false;
  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (!arg || arg.type !== 'object') continue;
    if (/timeZone|timezone/i.test(textOf(arg))) return true;
  }
  return false;
}

export default defineRule({
  id: 'explicit-kst-timezone',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Locale-aware date method without `timeZone` option is non-deterministic — pass `Asia/Seoul` explicitly.',
  messageKo: '`timeZone` 옵션 없는 locale 날짜 메서드는 환경별 결과 차이 — `Asia/Seoul` 명시 권장.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/explicit-kst-timezone.md',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn || fn.type !== 'member_expression') return;
      const prop = fn.childForFieldName('property');
      if (!prop) return;
      if (!LOCALE_METHODS.has(ctx.textOf(prop))) return;
      const args = node.childForFieldName('arguments');
      if (!hasTimezoneOption(args, ctx.textOf)) ctx.report({ node });
    },
  },
});
