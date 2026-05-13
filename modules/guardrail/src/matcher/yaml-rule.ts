import { z } from 'zod';
import { parse as parseYaml } from 'yaml';
import type { PatternRule } from '@aicqtools/rule-sdk';
import type { Language, Severity } from '@aicqtools/core';

const languageSchema = z.enum(['typescript', 'javascript', 'tsx', 'python']);
const severitySchema = z.enum(['error', 'warning', 'info']);

const yamlRuleSchema = z.object({
  id: z.string().min(1),
  language: z.union([languageSchema, z.array(languageSchema).min(1)]),
  severity: severitySchema,
  message: z.string().min(1),
  messageKo: z.string().optional(),
  docs: z.string().url().optional(),
  pathExclude: z.array(z.string().min(1)).optional(),
  query: z.string().min(1),
});

export type YamlRuleInput = z.infer<typeof yamlRuleSchema>;

export function parseYamlRule(source: string): PatternRule {
  const parsed = yamlRuleSchema.parse(parseYaml(source));
  const rule: PatternRule = {
    kind: 'pattern',
    id: parsed.id,
    language: parsed.language as Language | readonly Language[],
    severity: parsed.severity as Severity,
    message: parsed.message,
    query: parsed.query,
    ...(parsed.messageKo !== undefined ? { messageKo: parsed.messageKo } : {}),
    ...(parsed.docs !== undefined ? { docs: parsed.docs } : {}),
    ...(parsed.pathExclude !== undefined && parsed.pathExclude.length > 0
      ? { pathExclude: parsed.pathExclude }
      : {}),
  };
  return rule;
}
