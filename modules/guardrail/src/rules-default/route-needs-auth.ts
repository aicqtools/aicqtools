import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const ROUTER_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const AUTH_PATTERN = /auth(enticate)?|requireUser|requireAuth|isAuthenticated/i;
// Public path patterns that don't require auth
const PUBLIC_PATH_PATTERN = /^["'`](\/health|\/ping|\/login|\/signup|\/auth\/|\/public\/)/;

function isRouterCall(callee: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (callee.type !== 'member_expression') return false;
  const obj = callee.childForFieldName('object');
  const prop = callee.childForFieldName('property');
  if (!obj || !prop) return false;
  const objText = textOf(obj);
  if (objText !== 'router' && objText !== 'app') return false;
  return ROUTER_METHODS.has(textOf(prop));
}

export default defineRule({
  id: 'route-needs-auth',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'Route is missing an authentication middleware (e.g. `authenticate`, `requireAuth`).',
  messageKo: '라우트에 인증 미들웨어가 빠졌습니다 (`authenticate` / `requireAuth` 등).',
  visitors: {
    call_expression(node, ctx) {
      const callee = node.childForFieldName('function');
      if (!callee || !isRouterCall(callee, ctx.textOf)) return;
      const args = node.childForFieldName('arguments');
      if (!args || args.namedChildCount < 2) return;

      const pathArg = args.namedChild(0);
      if (pathArg && PUBLIC_PATH_PATTERN.test(ctx.textOf(pathArg))) return;

      let hasAuth = false;
      for (let i = 1; i < args.namedChildCount; i++) {
        const arg = args.namedChild(i);
        if (arg && AUTH_PATTERN.test(ctx.textOf(arg))) {
          hasAuth = true;
          break;
        }
      }
      if (!hasAuth) ctx.report({ node });
    },
  },
});
