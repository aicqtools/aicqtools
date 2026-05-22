import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const ROUTER_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const RATE_LIMIT_PATTERN = /rate.?limit/i;

/**
 * Test/spec files often contain DI-style lookups like NestJS `TestingModule.get(token)`,
 * which collide with the `app.get(...)` / `router.get(...)` route-registration shape that
 * this rule scans for. Defaulting these paths to skip removes the noise; users who really
 * register routes from spec files can opt out via `skipBuiltinSkips: true` or `overrides`.
 *
 * Surfaced by the Nest.js `typescript-starter` external dogfood (beta.1, 2026-05-21).
 */
export const SKIP_FILE_RE = /(\.test\.|\.spec\.|__tests__|e2e-spec)/;

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
  skipPatterns: [SKIP_FILE_RE],
  visitors: {
    call_expression(node, ctx) {
      if (!ctx.skipBuiltinSkips && SKIP_FILE_RE.test(ctx.filePath)) return;
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
