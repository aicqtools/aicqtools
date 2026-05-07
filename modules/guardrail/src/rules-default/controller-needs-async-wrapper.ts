import type Parser from 'tree-sitter';
import { defineRule } from '@aicq/rule-sdk';

const ROUTER_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function isRouterCall(callee: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (callee.type !== 'member_expression') return false;
  const obj = callee.childForFieldName('object');
  const prop = callee.childForFieldName('property');
  if (!obj || !prop) return false;
  const objText = textOf(obj);
  if (objText !== 'router' && objText !== 'app') return false;
  return ROUTER_METHODS.has(textOf(prop));
}

function isWrappedHandler(arg: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  if (arg.type !== 'call_expression') return false;
  const fn = arg.childForFieldName('function');
  if (!fn) return false;
  return /asyncWrapper|asyncHandler|catchAsync/i.test(textOf(fn));
}

function isAsyncFunction(arg: Parser.SyntaxNode): boolean {
  if (arg.type !== 'arrow_function' && arg.type !== 'function_expression') return false;
  for (let i = 0; i < arg.childCount; i++) {
    const child = arg.child(i);
    if (child && child.type === 'async') return true;
  }
  return arg.text.startsWith('async ');
}

export default defineRule({
  id: 'controller-needs-async-wrapper',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'Async route handlers must be wrapped with asyncWrapper / asyncHandler.',
  messageKo: '비동기 라우트 핸들러는 asyncWrapper / asyncHandler로 감싸야 합니다.',
  visitors: {
    call_expression(node, ctx) {
      const callee = node.childForFieldName('function');
      if (!callee || !isRouterCall(callee, ctx.textOf)) return;
      const args = node.childForFieldName('arguments');
      if (!args || args.namedChildCount < 2) return;
      const last = args.namedChild(args.namedChildCount - 1);
      if (!last) return;
      if (isAsyncFunction(last) && !isWrappedHandler(last, ctx.textOf)) {
        ctx.report({ node: last });
      }
    },
  },
});
