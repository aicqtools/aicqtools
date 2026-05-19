import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@aicqtools/guardrail', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    runProject: vi.fn().mockResolvedValue({ diagnostics: [], filesScanned: 0, durationMs: 1 }),
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
  cwd = await mkdtemp(join(tmpdir(), 'aicq-skip-builtin-skips-cli-'));
  mockedRunProject.mockClear();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runCheck — skipBuiltinSkips precedence (alpha.13)', () => {
  it('default (no config, no CLI) → skipBuiltinSkips omitted from runProject call', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.skipBuiltinSkips).toBeUndefined();
  });

  it('config `skipBuiltinSkips: true` → forwarded to runProject', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'skipBuiltinSkips: true\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.skipBuiltinSkips).toBe(true);
  });

  it('CLI `--skip-builtin-skips` wins over absent config (default false)', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, skipBuiltinSkips: true });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.skipBuiltinSkips).toBe(true);
  });

  it('CLI `--no-skip-builtin-skips` wins over config `skipBuiltinSkips: true`', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'skipBuiltinSkips: true\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, skipBuiltinSkips: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.skipBuiltinSkips).toBeUndefined();
  });
});
