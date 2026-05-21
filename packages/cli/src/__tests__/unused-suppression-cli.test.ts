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
  cwd = await mkdtemp(join(tmpdir(), 'aicq-unused-suppression-cli-'));
  mockedRunProject.mockClear();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

/**
 * Alpha.17 — `--report-unused-suppressions` precedence matrix. Mirrors the alpha.13
 * `--skip-builtin-skips` test file structure.
 */
describe('runCheck — reportUnusedSuppressions precedence (alpha.17)', () => {
  it('1. default (no config, no CLI) → reportUnusedSuppressions omitted from runProject call', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.reportUnusedSuppressions).toBeUndefined();
  });

  it('2. config `reportUnusedSuppressions: true` → forwarded to runProject', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'reportUnusedSuppressions: true\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.reportUnusedSuppressions).toBe(true);
  });

  it('3. CLI `--report-unused-suppressions` wins over absent config (default false)', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, reportUnusedSuppressions: true });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.reportUnusedSuppressions).toBe(true);
  });

  it('4. CLI `--no-report-unused-suppressions` wins over config `true`', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'reportUnusedSuppressions: true\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, reportUnusedSuppressions: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.reportUnusedSuppressions).toBeUndefined();
  });
});
