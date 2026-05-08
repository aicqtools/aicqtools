import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: when AI-derived results are surfaced to users, the
 * response should include explainability metadata (reasoning / sources /
 * model). Detect `res.json(...)` / `res.send(...)` payloads that look
 * AI-derived (variable name contains `ai`/`model`/`completion`) but lack
 * an explainability key.
 *
 * Limitation: name-based detection misses payloads built from generic
 * variables. Severity is `info` so existing services don't break.
 */
const AI_VAR = /\b(aiResult|aiResponse|completion|prediction|inference|llmResult)\b/;
const EXPLAIN_KEYS = /\b(reasoning|sources|model|modelVersion|explanation|references)\b/;

export default defineRule({
  id: 'ai-explainability-metadata',
  language: ['typescript', 'tsx'],
  severity: 'info',
  message: 'AI-derived response is missing explainability metadata (reasoning/sources/model) — FSC AI guideline.',
  messageKo: 'AI 응답에 설명가능성 메타데이터(reasoning/sources/model) 누락 — 금감원 AI 가이드라인.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/ai-explainability-metadata.md',
  visitors: {
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      const fnText = ctx.textOf(fnNode);
      if (!/\b(res|reply)\.(json|send)$/.test(fnText)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      if (!AI_VAR.test(argsText)) return;
      if (EXPLAIN_KEYS.test(argsText)) return;
      ctx.report({ node });
    },
  },
});
