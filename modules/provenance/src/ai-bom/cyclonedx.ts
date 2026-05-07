import type { ProvenanceRecord } from '../types.js';

/**
 * CycloneDX AI-BOM emitter (skeleton).
 *
 * Phase 0 emits a minimal but spec-shaped document. Phase 1a fills in
 * model cards, training data references, and risk classifications per
 * EU AI Act Annex IV.
 */

interface CycloneDxAiBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.6';
  version: 1;
  serialNumber: string;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
  };
  components: Array<{
    type: 'machine-learning-model';
    name: string;
    version?: string;
    'bom-ref': string;
  }>;
}

export function emitAiBom(record: ProvenanceRecord, toolVersion = '0.0.0'): CycloneDxAiBom {
  const models = new Map<string, { name: string; version?: string }>();
  for (const session of record.sessions) {
    const key = `${session.model}@${session.modelVersion ?? 'unspecified'}`;
    if (!models.has(key)) {
      models.set(key, {
        name: session.model,
        ...(session.modelVersion !== undefined ? { version: session.modelVersion } : {}),
      });
    }
  }
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    metadata: {
      timestamp: record.capturedAt,
      tools: [{ vendor: 'aicq', name: 'provenance', version: toolVersion }],
    },
    components: [...models.entries()].map(([ref, m]) => ({
      type: 'machine-learning-model',
      name: m.name,
      ...(m.version !== undefined ? { version: m.version } : {}),
      'bom-ref': ref,
    })),
  };
}
