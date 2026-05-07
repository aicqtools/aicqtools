import { z } from 'zod';
import type { Language } from '@aicq/core';
import type { Rule } from '@aicq/rule-sdk';
import { runFileWithSource } from '../runner/run-file.js';

const languageSchema = z.enum(['typescript', 'javascript', 'tsx', 'python']);

export const checkSnippetInputSchema = z.object({
  source: z.string(),
  language: languageSchema,
  filePath: z.string().optional(),
});

export type CheckSnippetInput = z.infer<typeof checkSnippetInputSchema>;

export interface CheckSnippetResult {
  readonly diagnostics: ReadonlyArray<{
    readonly ruleId: string;
    readonly severity: string;
    readonly message: string;
    readonly line: number;
    readonly column: number;
  }>;
}

export function handleCheckSnippet(input: unknown, rules: readonly Rule[]): CheckSnippetResult {
  const parsed = checkSnippetInputSchema.parse(input ?? {});
  const result = runFileWithSource(
    parsed.filePath ?? '<snippet>',
    parsed.source,
    parsed.language as Language,
    rules,
  );
  return {
    diagnostics: result.diagnostics.map((d) => ({
      ruleId: d.ruleId,
      severity: d.severity,
      message: d.messageKo ?? d.message,
      line: d.range.start.line,
      column: d.range.start.column,
    })),
  };
}

export interface ListRulesResult {
  readonly rules: ReadonlyArray<{
    readonly id: string;
    readonly severity: string;
    readonly languages: readonly string[];
    readonly message: string;
  }>;
}

export function handleListRules(rules: readonly Rule[]): ListRulesResult {
  return {
    rules: rules.map((r) => ({
      id: r.id,
      severity: r.severity,
      languages: Array.isArray(r.language) ? [...r.language] : [r.language],
      message: r.message,
    })),
  };
}
