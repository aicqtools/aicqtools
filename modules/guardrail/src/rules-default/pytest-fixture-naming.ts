import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

function hasPytestFixtureDecorator(node: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  // function_definition's parent is decorated_definition when decorated
  const parent = node.parent;
  if (!parent || parent.type !== 'decorated_definition') return false;
  for (let i = 0; i < parent.namedChildCount; i++) {
    const child = parent.namedChild(i);
    if (!child || child.type !== 'decorator') continue;
    const text = textOf(child);
    if (/@pytest\.fixture\b/.test(text) || /^@fixture\b/.test(text)) return true;
  }
  return false;
}

export default defineRule({
  id: 'pytest-fixture-naming',
  language: 'python',
  severity: 'warning',
  message: 'pytest fixture should not start with `test_` (it would be collected as a test instead).',
  messageKo: 'pytest fixture 함수는 `test_`로 시작하면 안 됩니다 (테스트로 인식되어 버립니다).',
  visitors: {
    function_definition(node, ctx) {
      const name = node.childForFieldName('name');
      if (!name) return;
      const nameText = ctx.textOf(name);
      if (!nameText.startsWith('test_')) return;
      if (hasPytestFixtureDecorator(node, ctx.textOf)) ctx.report({ node: name });
    },
  },
});
