import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: AI-driven decisions writing to authoritative storage must
 * pass through a human oversight checkpoint. Detect functions that invoke an
 * AI SDK and immediately persist the result via DB writes (insert/update/
 * create) without an explicit review marker (review/approve/oversight).
 *
 * Limitation: heuristic — best-effort detection. False positives in pipelines
 * that intentionally store the raw model output for downstream review.
 */
const AI_CALL = /\b(openai|anthropic|aiClient)\.\w+/;
const DB_WRITE = /\b(prisma|knex|db|sequelize|mongoose)\.\w+\.(insert|update|create|save|upsert|insertMany)|\.\$create\(|\.\$update\(/;
const REVIEW_MARKER = /\b(review|approve|oversight|humanCheck|approveByUser|requiresApproval)\b/i;

function check(node: Parser.SyntaxNode, ctx: RuleContext): void {
  const text = ctx.textOf(node);
  if (!AI_CALL.test(text)) return;
  if (!DB_WRITE.test(text)) return;
  if (REVIEW_MARKER.test(text)) return;
  ctx.report({ node });
}

export default defineRule({
  id: 'human-oversight-checkpoint',
  language: ['typescript', 'tsx'],
  severity: 'warning',
  message: 'AI inference result is persisted without a human oversight marker (FSC AI guideline — human-in-the-loop checkpoint).',
  messageKo: 'AI 추론 결과가 인간 검토 표시 없이 저장됩니다 (금감원 AI 가이드라인 — 인간 개입 포인트).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/human-oversight-checkpoint.md',
  visitors: {
    function_declaration: check,
    arrow_function: check,
    method_definition: check,
  },
});
