import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const SUBPROCESS_FNS = new Set(['run', 'call', 'check_call', 'check_output', 'Popen']);

function hasShellTrue(args: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (!arg || arg.type !== 'keyword_argument') continue;
    const name = arg.childForFieldName('name');
    const value = arg.childForFieldName('value');
    if (name && value && textOf(name) === 'shell' && textOf(value) === 'True') return true;
  }
  return false;
}

export default defineRule({
  id: 'no-shell-true',
  language: 'python',
  severity: 'error',
  message: 'subprocess with shell=True is a command injection vector — pass a list of args instead.',
  messageKo: 'subprocess의 shell=True는 명령어 주입 위험 — 인자를 리스트로 전달하세요.',
  visitors: {
    call(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn || fn.type !== 'attribute') return;
      const obj = fn.childForFieldName('object');
      const attr = fn.childForFieldName('attribute');
      if (!obj || !attr) return;
      if (ctx.textOf(obj) !== 'subprocess') return;
      if (!SUBPROCESS_FNS.has(ctx.textOf(attr))) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      if (hasShellTrue(args, ctx.textOf)) ctx.report({ node });
    },
  },
});
