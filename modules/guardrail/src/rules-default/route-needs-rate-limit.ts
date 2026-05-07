import type Parser from 'tree-sitter';
import { defineRule } from '@aicq/rule-sdk';

const ROUTER_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const RATE_LIMIT_PATTERN = /rate.?limit/i;

function isRouterCall(callee: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (callee.type !== 'member_expression') return false;
  const obj = callee.childForFieldName('object');
  const prop = callee.childForFieldName('property');
  if (!obj || !prop) return false;
  const objText = textOf(obj);
  if (objText !== 'router' && objText !== 'app') return false;
  return ROUTER_METHODS.has(textOf(prop));
}

function argHasRateLimit(arg: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  const text = textOf(arg);
  return RATE_LIMIT_PATTERN.test(text);
}

export default defineRule({
  id: 'route-needs-rate-limit',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'New route is missing a rate-limit middleware.',
  messageKo: '새 라우트에 rate-limit 미들웨어가 빠졌습니다.',
  visitors: {
    call_expression(node, ctx) {
      const callee = node.childForFieldName('function');
      if (!callee || !isRouterCall(callee, ctx.textOf)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      let hasRateLimit = false;
      for (let i = 0; i < args.namedChildCount; i++) {
        const arg = args.namedChild(i);
        if (arg && argHasRateLimit(arg, ctx.textOf)) {
          hasRateLimit = true;
          break;
        }
      }
      if (!hasRateLimit) ctx.report({ node });
    },
  },
});
