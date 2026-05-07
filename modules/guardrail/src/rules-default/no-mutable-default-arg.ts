import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

function isMutableLiteral(node: Parser.SyntaxNode): boolean {
  return node.type === 'list' || node.type === 'dictionary' || node.type === 'set';
}

export default defineRule({
  id: 'no-mutable-default-arg',
  language: 'python',
  severity: 'error',
  message: 'Mutable default argument (list/dict/set) is shared across calls — use None and initialize inside.',
  messageKo: '가변 기본 인자(list/dict/set)는 모든 호출에 공유됩니다 — None을 기본값으로 두고 함수 내부에서 초기화하세요.',
  visitors: {
    function_definition(node, ctx) {
      const params = node.childForFieldName('parameters');
      if (!params) return;
      for (let i = 0; i < params.namedChildCount; i++) {
        const param = params.namedChild(i);
        if (!param) continue;
        if (param.type === 'default_parameter' || param.type === 'typed_default_parameter') {
          const value = param.childForFieldName('value');
          if (value && isMutableLiteral(value)) {
            ctx.report({ node: param });
          }
        }
      }
    },
  },
});
