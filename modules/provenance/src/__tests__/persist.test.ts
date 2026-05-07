import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRecord, writeProvenanceRecord } from '../git-hook/persist.js';

describe('persist', () => {
  it('writes a versioned record JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aicq-prov-'));
    try {
      const record = buildRecord({
        sessions: [
          {
            sessionId: 'a',
            tool: 'claude-code',
            model: 'claude-opus-4-7',
            startedAt: '2026-05-07T10:00:00Z',
          },
        ],
        prompts: [],
        attributions: [
          { filePath: 'x.ts', startLine: 1, endLine: 5, sessionId: 'a', humanEdited: false },
        ],
      });
      const file = join(dir, 'rec.json');
      await writeProvenanceRecord(file, record);
      const parsed = JSON.parse(await readFile(file, 'utf-8'));
      expect(parsed.version).toBe('0.1');
      expect(parsed.attributions).toHaveLength(1);
      expect(typeof parsed.capturedAt).toBe('string');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
