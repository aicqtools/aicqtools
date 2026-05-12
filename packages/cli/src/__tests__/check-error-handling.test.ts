import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ParserError } from '@aicqtools/core';

vi.mock('@aicqtools/guardrail', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    runProject: vi.fn(),
    loadAllBuiltinRules: vi.fn().mockResolvedValue([]),
    loadFunctionRulesFromDir: vi.fn().mockResolvedValue([]),
  };
});

import { runCheck } from '../commands/check.js';
import { runProject } from '@aicqtools/guardrail';

const mockedRunProject = vi.mocked(runProject);

let cwd: string;
let stderrSpy: ReturnType<typeof vi.spyOn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'aicq-cli-test-'));
  // Empty config so loadConfig returns defaults.
  await writeFile(join(cwd, 'aicq.config.yaml'), 'locale: ko\n', 'utf-8');
  mockedRunProject.mockReset();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runCheck — ParserError handling', () => {
  it('returns exit code 2 and writes file path + cause to stderr (ko)', async () => {
    mockedRunProject.mockImplementation(async () => {
      throw new ParserError('/x/CharacterForm.tsx', new Error('Invalid argument'));
    });

    const exit = await runCheck({ cwd, format: 'text', locale: 'ko', cache: false });
    expect(exit).toBe(2);
    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).toContain('/x/CharacterForm.tsx');
    expect(stderrCalls).toContain('Invalid argument');
    expect(stderrCalls).toContain('파서 실패');
  });

  it('returns exit code 2 and writes file path + cause to stderr (en)', async () => {
    mockedRunProject.mockImplementation(async () => {
      throw new ParserError('/x/CharacterForm.tsx', new Error('Invalid argument'));
    });

    const exit = await runCheck({ cwd, format: 'text', locale: 'en', cache: false });
    expect(exit).toBe(2);
    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).toContain('parser failed on /x/CharacterForm.tsx: Invalid argument');
  });

  it('re-throws non-ParserError errors', async () => {
    mockedRunProject.mockImplementation(async () => {
      throw new Error('something else');
    });

    await expect(runCheck({ cwd, format: 'text', locale: 'ko', cache: false })).rejects.toThrow(
      'something else',
    );
  });
});
