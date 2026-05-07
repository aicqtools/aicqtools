import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Heuristic: when `JSON.stringify(...)` is called on a value whose name suggests
 * a request/response/model object (likely to contain circular references via ORM
 * relations), warn. Encourages the explicit `safeStringify` or `replacer` patterns.
 */
const SUSPICIOUS_NAME_PATTERN = /^(req|res|request|response|model|instance|entity|record|row|user|order|product|item)$/i;

export default defineRule({
  id: 'no-jsonb-circular',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'JSON.stringify on ORM/request/response objects may hit circular references — use safeStringify or pick fields explicitly.',
  messageKo: 'ORM/요청/응답 객체에 JSON.stringify는 순환 참조 위험 — safeStringify 또는 명시적 필드 선택 권장.',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      if (ctx.textOf(fn) !== 'JSON.stringify') return;
      const args = node.childForFieldName('arguments');
      if (!args || args.namedChildCount === 0) return;
      const first = args.namedChild(0);
      if (!first || first.type !== 'identifier') return;
      if (SUSPICIOUS_NAME_PATTERN.test(ctx.textOf(first))) {
        ctx.report({ node });
      }
    },
  },
});
