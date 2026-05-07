import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Functions with a single boolean argument force callers to write
 * `doThing(true)` whose meaning is unclear at the call site. Use an
 * options object instead (e.g. `doThing({ silent: true })`).
 */
export default defineRule({
  id: 'no-boolean-trap',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Boolean-only function argument is opaque at call sites — prefer an options object.',
  messageKo: '함수 인자에 boolean 단독은 호출부에서 의미가 불분명합니다 — 옵션 객체를 권장합니다.',
  visitors: {
    function_declaration(node, ctx) {
      const params = node.childForFieldName('parameters');
      if (!params) return;
      if (params.namedChildCount !== 1) return;
      const onlyParam = params.namedChild(0);
      if (!onlyParam) return;
      const text = ctx.textOf(onlyParam);
      // Skip object/array type literals (e.g. `opts: { silent: boolean }`)
      if (text.includes('{') || text.includes('[')) return;
      if (/:\s*boolean(\s|$|=)/.test(text)) {
        ctx.report({ node: onlyParam });
      }
    },
  },
});
