import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileCache, hashRulesetSignature } from '../cache/index.js';
import type { Diagnostic } from '../types.js';

const sampleDiag: Diagnostic = {
  ruleId: 'no-console-log',
  severity: 'warning',
  message: 'No console.log',
  file: 'a.ts',
  range: { start: { line: 1, column: 1 }, end: { line: 1, column: 12 } },
};

describe('FileCache', () => {
  let dir: string;
  let cache: FileCache;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aicq-cache-'));
    cache = new FileCache(join(dir, 'cache.sqlite'));
  });

  afterEach(async () => {
    cache.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null for missing entry', () => {
    const got = cache.get({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' });
    expect(got).toBeNull();
  });

  it('stores and retrieves diagnostics', () => {
    const key = { filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' };
    cache.set(key, [sampleDiag]);
    const got = cache.get(key);
    expect(got).toHaveLength(1);
    expect(got?.[0]?.ruleId).toBe('no-console-log');
  });

  it('invalidates on mtime change', () => {
    cache.set({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' }, [sampleDiag]);
    expect(cache.get({ filePath: 'a.ts', mtime: 2, size: 10, rulesHash: 'h1' })).toBeNull();
  });

  it('invalidates on rules-hash change', () => {
    cache.set({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' }, [sampleDiag]);
    expect(cache.get({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h2' })).toBeNull();
  });

  it('overwrites existing entry on second set', () => {
    cache.set({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' }, [sampleDiag]);
    cache.set({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' }, []);
    expect(cache.get({ filePath: 'a.ts', mtime: 1, size: 10, rulesHash: 'h1' })).toHaveLength(0);
  });
});

describe('hashRulesetSignature', () => {
  it('is deterministic regardless of input order', () => {
    expect(hashRulesetSignature(['a', 'b', 'c'])).toBe(hashRulesetSignature(['c', 'a', 'b']));
  });

  it('changes when inputs change', () => {
    expect(hashRulesetSignature(['a'])).not.toBe(hashRulesetSignature(['b']));
  });
});
