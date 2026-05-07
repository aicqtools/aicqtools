import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Public functions (not starting with `_`) should have a return type annotation.
 * Helps catch type errors and serves as inline documentation.
 *
 * Heuristic: looks for `-> Type:` after parameter list. False positives possible
 * for functions that genuinely have no useful return type, but that's rare.
 */
export default defineRule({
  id: 'type-hint-required-public',
  language: 'python',
  severity: 'info',
  message: 'Public function is missing a return type annotation (`-> Type:`).',
  messageKo: 'public 함수에 반환 타입 어노테이션 누락 (`-> Type:`).',
  visitors: {
    function_definition(node, ctx) {
      const name = node.childForFieldName('name');
      if (!name) return;
      const nameText = ctx.textOf(name);
      if (nameText.startsWith('_')) return;
      const returnType = node.childForFieldName('return_type');
      if (!returnType) ctx.report({ node: name });
    },
  },
});
