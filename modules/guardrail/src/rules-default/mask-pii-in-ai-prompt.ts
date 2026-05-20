import type Parser from 'tree-sitter';
import { z } from 'zod';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * FSC AI guideline: personal information (RRN, card number) must be masked
 * before being passed to AI providers. Detect literal Korean RRN patterns
 * (\d{6}-\d{7}) or 16-digit card numbers in string/template arguments of
 * AI SDK calls.
 *
 * Alpha.16: `options.piiPatterns: string[]` (regex source array) — default is the alpha.15
 * RRN + card-number pair. Users can extend (passport numbers, account numbers) or replace
 * the set. The AI SDK call pattern (`AI_CALL`) stays a fixed default this cycle — exposing
 * it as an option is deferred to a future release.
 *
 * Limitation: false negatives if PII enters via interpolated variables; false positives if a
 * legitimate test fixture contains a digit run. User-supplied regex source strings are not
 * safety-checked (catastrophic backtracking is the user's responsibility).
 */
const DEFAULT_PII_PATTERNS: readonly string[] = [
  '\\b\\d{6}-\\d{7}\\b',
  '\\b(?:\\d[ -]?){15,16}\\b',
] as const;

const AI_CALL = /\b(openai|anthropic|aiClient)\.\w+/;

const optionsSchema = z
  .object({
    piiPatterns: z.array(z.string()).default([...DEFAULT_PII_PATTERNS]),
  })
  .strict();

interface MaskPiiInAiPromptOptions {
  readonly piiPatterns: readonly string[];
}

// Module-scope compile cache — when the same source array repeats across calls (common case:
// one `applyRuleConfig` per run), we skip the `new RegExp` cost. Reference equality on the
// source array key is sufficient for resolve-rule-options call patterns.
let cachedSource: readonly string[] | null = null;
let cachedCompiled: readonly RegExp[] | null = null;

function compilePiiPatterns(source: readonly string[]): readonly RegExp[] {
  if (cachedSource === source && cachedCompiled !== null) return cachedCompiled;
  const compiled = source.map((s) => new RegExp(s));
  cachedSource = source;
  cachedCompiled = compiled;
  return compiled;
}

function inspectArgsString(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export default defineRule({
  id: 'mask-pii-in-ai-prompt',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'AI prompt contains unmasked PII (Korean RRN or card number) — mask before sending (FSC AI guideline — privacy protection).',
  messageKo: 'AI 프롬프트에 마스킹되지 않은 개인정보(주민번호/카드번호)가 포함되어 있습니다 — AI 호출 전 마스킹 필수 (금감원 AI 가이드라인 — 개인정보 보호).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/mask-pii-in-ai-prompt.md',
  options: {
    schema: optionsSchema,
    defaults: { piiPatterns: [...DEFAULT_PII_PATTERNS] },
  },
  visitors: {
    call_expression(node: Parser.SyntaxNode, ctx: RuleContext) {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      const fnText = ctx.textOf(fnNode);
      if (!AI_CALL.test(fnText)) return;
      const args = node.childForFieldName('arguments');
      if (!args) return;
      const argsText = ctx.textOf(args);
      const opts = (ctx.options as MaskPiiInAiPromptOptions | undefined) ?? {
        piiPatterns: DEFAULT_PII_PATTERNS,
      };
      if (opts.piiPatterns.length === 0) return;
      const compiled = compilePiiPatterns(opts.piiPatterns);
      if (inspectArgsString(argsText, compiled)) ctx.report({ node });
    },
  },
});
