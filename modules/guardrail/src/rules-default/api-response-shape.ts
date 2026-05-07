import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

function isResJsonCall(callee: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (callee.type !== 'member_expression') return false;
  const obj = callee.childForFieldName('object');
  const prop = callee.childForFieldName('property');
  if (!obj || !prop) return false;
  return textOf(obj) === 'res' && textOf(prop) === 'json';
}

function objectHasKey(obj: Parser.SyntaxNode, key: string, textOf: (n: Parser.SyntaxNode) => string): boolean {
  for (let i = 0; i < obj.namedChildCount; i++) {
    const pair = obj.namedChild(i);
    if (!pair) continue;
    if (pair.type === 'shorthand_property_identifier') {
      if (textOf(pair) === key) return true;
      continue;
    }
    if (pair.type !== 'pair') continue;
    const k = pair.childForFieldName('key');
    if (k && textOf(k).replace(/['"]/g, '') === key) return true;
  }
  return false;
}

export default defineRule({
  id: 'api-response-shape',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'API responses must use the standard shape: { success, data, message }.',
  messageKo: 'API 응답은 { success, data, message } 표준 형태여야 합니다.',
  visitors: {
    call_expression(node, ctx) {
      const callee = node.childForFieldName('function');
      if (!callee || !isResJsonCall(callee, ctx.textOf)) return;
      const args = node.childForFieldName('arguments');
      if (!args || args.namedChildCount === 0) return;
      const first = args.namedChild(0);
      if (!first || first.type !== 'object') return;
      if (!objectHasKey(first, 'success', ctx.textOf)) {
        ctx.report({ node: first });
      }
    },
  },
});
