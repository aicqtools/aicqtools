import { z } from 'zod';

export const localeSchema = z.enum(['ko', 'en']).default('en');

export const guardrailModuleSchema = z
  .object({
    enabled: z.boolean().default(true),
    rulesDir: z.string().default('aicq/rules'),
    extends: z.array(z.string()).default([]),
    rules: z.record(z.union([z.literal('off'), z.literal('warn'), z.literal('error')])).default({}),
  })
  .default({});

export const provenanceModuleSchema = z
  .object({
    enabled: z.boolean().default(false),
    captureSession: z.boolean().default(true),
    output: z.string().default('aicq/provenance'),
  })
  .default({});

export const supplyChainModuleSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({});

export const aicqConfigSchema = z.object({
  $schema: z.string().optional(),
  locale: localeSchema,
  include: z.array(z.string()).default(['**/*.{ts,tsx,js,mjs,cjs,jsx,py}']),
  exclude: z
    .array(z.string())
    .default(['**/node_modules/**', '**/dist/**', '**/.turbo/**', '**/build/**']),
  modules: z
    .object({
      guardrail: guardrailModuleSchema,
      provenance: provenanceModuleSchema,
      supplyChain: supplyChainModuleSchema,
    })
    .default({}),
});

export type AicqConfig = z.infer<typeof aicqConfigSchema>;
