import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const ALLOWED_NUMBERS = new Set(['0', '1', '-1', '2', '10', '100', '1000']);

function isInTestFile(filePath: string): boolean {
  return /(\.test\.|\.spec\.|__tests__|fixtures)/.test(filePath);
}

function isInTimeoutMsContext(node: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  // Allow magic numbers in obvious time/duration contexts where the unit is in the variable name
  let parent = node.parent;
  while (parent) {
    const text = textOf(parent);
    if (/timeout|interval|duration|delay|ms|sec|hour|day/i.test(text.slice(0, 40))) return true;
    if (parent.type === 'function_declaration' || parent.type === 'method_definition') break;
    parent = parent.parent;
  }
  return false;
}

export default defineRule({
  id: 'no-magic-number',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Magic number — extract to a named constant for clarity.',
  messageKo: '매직 넘버 — 명명된 상수로 추출해 의미를 명확히 하세요.',
  visitors: {
    number(node, ctx) {
      if (isInTestFile(ctx.filePath)) return;
      const text = ctx.textOf(node);
      if (ALLOWED_NUMBERS.has(text)) return;
      if (isInTimeoutMsContext(node, ctx.textOf)) return;
      // Skip numbers inside variable_declarator (the const definition itself)
      const parent = node.parent;
      if (parent && parent.type === 'variable_declarator') return;
      ctx.report({ node });
    },
  },
});
