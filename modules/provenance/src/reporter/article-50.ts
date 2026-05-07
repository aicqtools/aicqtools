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
}

export function buildArticle50Report(record: ProvenanceRecord): Article50Report {
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
  return {
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
}
