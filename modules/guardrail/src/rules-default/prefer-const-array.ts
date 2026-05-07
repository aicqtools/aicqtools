import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * If a `let` declares an array literal (`let xs = []` or `let xs: T[] = []`)
 * and is initialized once, prefer `const`. This is a heuristic — false positives
 * exist when the variable is reassigned (not just mutated) later. Limited scope:
 * only flags top-level `let xs = [...]` in functions.
 */
export default defineRule({
  id: 'prefer-const-array',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Use `const` for array variables that are not reassigned (mutation via push/splice is allowed).',
  messageKo: '재할당하지 않는 배열은 `const`를 사용하세요 (push/splice 같은 mutation은 const에서도 가능).',
  visitors: {
    lexical_declaration(node, ctx) {
      const text = ctx.textOf(node);
      if (!text.startsWith('let ')) return;
      // Look for `= [` initialization
      let initIsArray = false;
      for (let i = 0; i < node.namedChildCount; i++) {
        const decl = node.namedChild(i);
        if (!decl || decl.type !== 'variable_declarator') continue;
        const value = decl.childForFieldName('value');
        if (value && value.type === 'array') initIsArray = true;
      }
      if (initIsArray) ctx.report({ node });
    },
  },
});
