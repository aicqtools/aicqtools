import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

function bodyHasAwait(body: Parser.SyntaxNode): boolean {
  function walk(n: Parser.SyntaxNode): boolean {
    if (n.type === 'await') return true;
    // Don't descend into nested function/class definitions
    if (n.type === 'function_definition' || n.type === 'lambda' || n.type === 'class_definition') {
      return false;
    }
    for (let i = 0; i < n.namedChildCount; i++) {
      const child = n.namedChild(i);
      if (child && walk(child)) return true;
    }
    return false;
  }
  return walk(body);
}

export default defineRule({
  id: 'async-await-consistency',
  language: 'python',
  severity: 'warning',
  message: '`async def` function has no `await` — likely should be a regular `def`.',
  messageKo: '`async def` 함수에 `await`가 없습니다 — 일반 `def`로 정의하세요.',
  visitors: {
    function_definition(node, ctx) {
      const text = ctx.textOf(node);
      if (!text.startsWith('async ')) return;
      const body = node.childForFieldName('body');
      if (!body) return;
      if (!bodyHasAwait(body)) ctx.report({ node });
    },
  },
});
