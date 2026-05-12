import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileCache } from '@aicqtools/core';

vi.mock('../runner/run-file.js', () => ({
  runFile: vi.fn(),
}));

import { runProject } from '../runner/run-project.js';
import { runFile } from '../runner/run-file.js';

const mockedRunFile = vi.mocked(runFile);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'aicq-isolation-'));
  await writeFile(join(dir, 'a.ts'), 'export const a = 1;\n', 'utf-8');
  await writeFile(join(dir, 'bad.ts'), 'export const b = 2;\n', 'utf-8');
  await writeFile(join(dir, 'c.ts'), 'export const c = 3;\n', 'utf-8');
  mockedRunFile.mockReset();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('runProject — per-file isolation', () => {
  it('a single parser failure does not abort the whole run', async () => {
    mockedRunFile.mockImplementation(async (file) => {
      if (file.endsWith('bad.ts')) throw new Error('Invalid argument');
      return { filePath: file, language: 'typescript', diagnostics: [] };
    });

    const result = await runProject({
      cwd: dir,
      include: ['*.ts'],
      exclude: [],
      rules: [],
    });

    expect(result.filesScanned).toBe(3);
    const parseFailed = result.diagnostics.filter((d) => d.ruleId === '@aicq/parse-failed');
    expect(parseFailed).toHaveLength(1);
    expect(parseFailed[0]?.file.endsWith('bad.ts')).toBe(true);
    expect(parseFailed[0]?.severity).toBe('warning');
    expect(parseFailed[0]?.message).toContain('Invalid argument');
    expect(parseFailed[0]?.messageKo).toContain('Invalid argument');
  });

  it('all files failing still completes without throwing', async () => {
    mockedRunFile.mockImplementation(async () => {
      throw new Error('Invalid argument');
    });

    const result = await runProject({
      cwd: dir,
      include: ['*.ts'],
      exclude: [],
      rules: [],
    });

    expect(result.filesScanned).toBe(3);
    const parseFailed = result.diagnostics.filter((d) => d.ruleId === '@aicq/parse-failed');
    expect(parseFailed).toHaveLength(3);
  });

  it('failures are not cached — next run retries', async () => {
    const cache = new FileCache(join(dir, 'cache.sqlite'));
    let calls = 0;
    mockedRunFile.mockImplementation(async (file) => {
      calls++;
      if (file.endsWith('bad.ts')) throw new Error('Invalid argument');
      return { filePath: file, language: 'typescript', diagnostics: [] };
    });

    await runProject({
      cwd: dir,
      include: ['*.ts'],
      exclude: [],
      rules: [],
      cache,
    });
    const firstCalls = calls;

    // Second run: a.ts and c.ts hit cache (no runFile call); bad.ts retries (one more call).
    await runProject({
      cwd: dir,
      include: ['*.ts'],
      exclude: [],
      rules: [],
      cache,
    });

    expect(calls).toBe(firstCalls + 1);
    cache.close();
  });
});
