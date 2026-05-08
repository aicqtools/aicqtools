import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: AI inference calls must specify the model name explicitly
 * so audits can trace which model produced a given decision. Detect calls to
 * `openai.chat.completions.create()` / `anthropic.messages.create()` whose
 * argument object lacks a `model:` property.
 *
 * Limitation: false negatives when the options object is built elsewhere and
 * passed in as a variable.
 */
const TARGET_FN = /\b(openai\.chat\.completions\.create|anthropic\.messages\.create|openai\.completions\.create)$/;

export default defineRule({
  id: 'track-ai-model-version',
  language: ['typescript', 'tsx'],
  severity: 'warning',
  message: 'AI inference call missing explicit `model:` parameter (FSC AI guideline — model governance).',
  messageKo: 'AI 추론 호출에 `model:` 파라미터가 명시되지 않았습니다 (금감원 AI 가이드라인 — 모델 거버넌스).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/track-ai-model-version.md',
  visitors: {
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      const fnText = ctx.textOf(fnNode);
      if (!TARGET_FN.test(fnText)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      if (/\bmodel\s*:/.test(argsText)) return;
      ctx.report({ node });
    },
  },
});
