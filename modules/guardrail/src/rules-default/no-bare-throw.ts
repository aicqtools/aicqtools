import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Forbids `throw <non-Error>` (e.g. `throw "msg"`, `throw 42`, `throw {x:1}`).
 * Errors should always be Error instances or its subclasses for stack-trace + instanceof checks.
 */
export default defineRule({
  id: 'no-bare-throw',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'Throw an Error instance, not a raw value (string/number/object).',
  messageKo: 'raw 값 대신 Error 인스턴스를 throw 하세요 (스택 트레이스 + instanceof 검사 가능).',
  visitors: {
    throw_statement(node, ctx) {
      const expr = node.namedChild(0);
      if (!expr) return;
      // Allow: new Error(...), new <SomethingError>(...), call expressions, identifiers (assume Error var)
      if (expr.type === 'new_expression' || expr.type === 'identifier' || expr.type === 'call_expression') return;
      // Flag: string_literal, number, true/false, object literal
      if (
        expr.type === 'string' ||
        expr.type === 'template_string' ||
        expr.type === 'number' ||
        expr.type === 'true' ||
        expr.type === 'false' ||
        expr.type === 'object'
      ) {
        ctx.report({ node });
      }
    },
  },
});
