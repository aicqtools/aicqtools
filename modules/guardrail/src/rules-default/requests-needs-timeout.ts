import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const REQUESTS_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'request']);

function hasTimeoutKwarg(args: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (!arg) continue;
    if (arg.type === 'keyword_argument') {
      const name = arg.childForFieldName('name');
      if (name && textOf(name) === 'timeout') return true;
    }
  }
  return false;
}

export default defineRule({
  id: 'requests-needs-timeout',
  language: 'python',
  severity: 'error',
  message: 'requests call missing `timeout=...` — without it the call can hang indefinitely.',
  messageKo: 'requests 호출에 `timeout=...` 누락 — 무한 대기 위험.',
  visitors: {
    call(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn || fn.type !== 'attribute') return;
      const obj = fn.childForFieldName('object');
      const attr = fn.childForFieldName('attribute');
      if (!obj || !attr) return;
      if (ctx.textOf(obj) !== 'requests') return;
      if (!REQUESTS_METHODS.has(ctx.textOf(attr))) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      if (!hasTimeoutKwarg(args, ctx.textOf)) ctx.report({ node });
    },
  },
});
