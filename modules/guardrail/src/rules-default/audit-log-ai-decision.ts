import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: every AI inference decision must produce an audit log entry.
 * Heuristic: if a function body invokes an AI SDK (openai/anthropic/aiClient) but
 * has no logger / audit / console.log call, flag it.
 *
 * Limitation: false positives when logging is delegated to a wrapper that doesn't
 * match the regex. Flip severity to warning if your codebase wraps logging extensively.
 */
const AI_CALL_PATTERN = /\b(openai|anthropic|aiClient)\.\w+/;
const LOG_PATTERN = /\b(logger|auditLog|audit|trace|winston|pino)\.\w+|\bconsole\.(log|info|warn|error)/;

function check(node: Parser.SyntaxNode, ctx: RuleContext): void {
  const text = ctx.textOf(node);
  if (!AI_CALL_PATTERN.test(text)) return;
  if (LOG_PATTERN.test(text)) return;
  ctx.report({ node });
}

export default defineRule({
  id: 'audit-log-ai-decision',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'AI inference call must be paired with an audit log entry (FSC AI guideline).',
  messageKo: 'AI 추론 호출은 감사 로그가 필수입니다 (금감원 AI 가이드라인).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/audit-log-ai-decision.md',
  visitors: {
    function_declaration: check,
    arrow_function: check,
    method_definition: check,
  },
});
