import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ProvenanceRecord } from '../types.js';

export async function writeProvenanceRecord(
  filePath: string,
  record: ProvenanceRecord,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

export function buildRecord(
  partial: Pick<ProvenanceRecord, 'sessions' | 'prompts' | 'attributions'>,
): ProvenanceRecord {
  return {
    version: '0.1',
    sessions: partial.sessions,
    prompts: partial.prompts,
    attributions: partial.attributions,
    capturedAt: new Date().toISOString(),
  };
}
