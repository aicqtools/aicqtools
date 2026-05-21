import { z, type ZodTypeAny } from 'zod';
import { parse as parseYaml } from 'yaml';
import type { PatternRule } from '@aicqtools/rule-sdk';
import type { Language, Severity } from '@aicqtools/core';

const languageSchema = z.enum(['typescript', 'javascript', 'tsx', 'python']);
const severitySchema = z.enum(['error', 'warning', 'info']);

/**
 * Alpha.18 — YAML PatternRule 옵션 framework 편입. YAML rule이 `options.defaults` (Record)
 * 만 적으면 runtime에 그 키 set으로 strict object schema를 자동 합성. 사용자가 config의
 * `rules.<id>.options`로 override 가능 (알파.14 framework 통과). YAML 작성자가 zod schema를
 * 직접 적을 수 없으므로 값 타입 검증은 `z.unknown()`까지만 — strict object가 typo 키만 캐치.
 * Query 동적 substitution은 v1.0+ 후속 사이클.
 */
const yamlOptionsSchema = z
  .object({
    defaults: z.record(z.unknown()),
  })
  .strict();

const yamlRuleSchema = z.object({
  id: z.string().min(1),
  language: z.union([languageSchema, z.array(languageSchema).min(1)]),
  severity: severitySchema,
  message: z.string().min(1),
  messageKo: z.string().optional(),
  docs: z.string().url().optional(),
  pathExclude: z.array(z.string().min(1)).optional(),
  query: z.string().min(1),
  options: yamlOptionsSchema.optional(),
});

export type YamlRuleInput = z.infer<typeof yamlRuleSchema>;

/**
 * Build a strict zod object schema from a defaults record. Each key gets `z.unknown()` so YAML
 * rule writers can declare option shapes without a zod DSL — typo keys are still caught at run
 * time by the `.strict()` modifier when users override the option in `aicq.config.yaml`.
 */
function buildOptionsSchemaFromDefaults(
  defaults: Readonly<Record<string, unknown>>,
): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};
  for (const key of Object.keys(defaults)) {
    shape[key] = z.unknown();
  }
  return z.object(shape).strict();
}

export function parseYamlRule(source: string): PatternRule {
  const parsed = yamlRuleSchema.parse(parseYaml(source));
  const options = parsed.options
    ? {
        schema: buildOptionsSchemaFromDefaults(parsed.options.defaults),
        defaults: { ...parsed.options.defaults },
      }
    : undefined;
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
    ...(options !== undefined ? { options } : {}),
  };
  return rule;
}
