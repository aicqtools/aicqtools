import type { CheckResult, Severity } from '@aicqtools/core';
import type { ProvenanceRecord } from '../types.js';

/**
 * EU AI Act Article 50 compliance report (skeleton).
 *
 * Article 50 requires disclosure of:
 *   - AI system identity (model + provider)
 *   - Generation timestamps
 *   - Human oversight points
 *   - Training data summary (where applicable)
 *
 * Phase 1a will produce both JSON (machine-readable) and PDF (auditor-friendly).
 */

export interface GuardrailSummary {
  readonly severityCount: Readonly<Record<Severity, number>>;
  readonly categoryCount: Readonly<Record<string, number>>;
  readonly filesWithViolations: number;
  readonly totalViolations: number;
}

export interface Article50Report {
  readonly format: 'aicq-article50/0.1';
  readonly generatedAt: string;
  readonly aiSystems: ReadonlyArray<{
    readonly tool: string;
    readonly model: string;
    readonly modelVersion: string | null;
    readonly sessionCount: number;
  }>;
  readonly attributedFiles: readonly string[];
  readonly guardrailSummary?: GuardrailSummary;
}

export interface BuildArticle50Options {
  readonly guardrail?: CheckResult;
}

export function summarizeGuardrail(result: CheckResult): GuardrailSummary {
  const severityCount: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const categoryCount: Record<string, number> = {};
  const filesWithViolations = new Set<string>();

  for (const d of result.diagnostics) {
    severityCount[d.severity] = (severityCount[d.severity] ?? 0) + 1;
    categoryCount[d.ruleId] = (categoryCount[d.ruleId] ?? 0) + 1;
    filesWithViolations.add(d.file);
  }

  return {
    severityCount,
    categoryCount,
    filesWithViolations: filesWithViolations.size,
    totalViolations: result.diagnostics.length,
  };
}

export function buildArticle50Report(
  record: ProvenanceRecord,
  options?: BuildArticle50Options,
): Article50Report {
  const systems = new Map<string, { tool: string; model: string; modelVersion: string | null; count: number }>();
  for (const s of record.sessions) {
    const key = `${s.tool}|${s.model}|${s.modelVersion ?? ''}`;
    const existing = systems.get(key);
    if (existing) existing.count += 1;
    else
      systems.set(key, {
        tool: s.tool,
        model: s.model,
        modelVersion: s.modelVersion ?? null,
        count: 1,
      });
  }
  const files = new Set(record.attributions.map((a) => a.filePath));
  const base: Article50Report = {
    format: 'aicq-article50/0.1',
    generatedAt: new Date().toISOString(),
    aiSystems: [...systems.values()].map((s) => ({
      tool: s.tool,
      model: s.model,
      modelVersion: s.modelVersion,
      sessionCount: s.count,
    })),
    attributedFiles: [...files],
  };
  if (options?.guardrail) {
    return { ...base, guardrailSummary: summarizeGuardrail(options.guardrail) };
  }
  return base;
}
