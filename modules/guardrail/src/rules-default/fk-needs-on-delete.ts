import type Parser from 'tree-sitter';
import { defineRule } from '@aicq/rule-sdk';

const FK_METHODS = new Set(['belongsTo', 'hasMany', 'hasOne', 'belongsToMany']);

function findObjectArg(args: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (arg && arg.type === 'object') return arg;
  }
  return null;
}

function objectHasKey(obj: Parser.SyntaxNode, key: string, textOf: (n: Parser.SyntaxNode) => string): boolean {
  for (let i = 0; i < obj.namedChildCount; i++) {
    const pair = obj.namedChild(i);
    if (!pair || (pair.type !== 'pair' && pair.type !== 'shorthand_property_identifier')) continue;
    if (pair.type === 'shorthand_property_identifier') {
      if (textOf(pair) === key) return true;
      continue;
    }
    const k = pair.childForFieldName('key');
    if (k && textOf(k).replace(/['"]/g, '') === key) return true;
  }
  return false;
}

export default defineRule({
  id: 'fk-needs-on-delete',
  language: ['typescript', 'javascript'],
  severity: 'error',
  message: 'Foreign-key association is missing an explicit `onDelete` policy.',
  messageKo: 'FK 관계에 명시적 `onDelete` 정책이 빠졌습니다.',
  visitors: {
    call_expression(node, ctx) {
      const callee = node.childForFieldName('function');
      if (!callee || callee.type !== 'member_expression') return;
      const prop = callee.childForFieldName('property');
      if (!prop || !FK_METHODS.has(ctx.textOf(prop))) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const opts = findObjectArg(args);
      if (!opts) {
        ctx.report({ node });
        return;
      }
      if (!objectHasKey(opts, 'onDelete', ctx.textOf)) ctx.report({ node });
    },
  },
});
