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
  cwd = await mkdtemp(join(tmpdir(), 'aicq-gitignore-auto-'));
  mockedRunProject.mockClear();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runCheck — respectGitignore precedence (alpha.9)', () => {
  it('auto + .gitignore present → respectGitignore=true is forwarded to runProject', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8'); // empty → defaults: auto
    await writeFile(join(cwd, '.gitignore'), 'node_modules/\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    expect(mockedRunProject).toHaveBeenCalledTimes(1);
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBe(true);
  });

  it('auto + no .gitignore → respectGitignore is omitted (falsy)', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBeUndefined();
  });

  it('explicit `respectGitignore: true` in config → forwarded even without a .gitignore', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'respectGitignore: true\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBe(true);
  });

  it('explicit `respectGitignore: false` in config → not forwarded even with a .gitignore', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'respectGitignore: false\n', 'utf-8');
    await writeFile(join(cwd, '.gitignore'), 'node_modules/\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBeUndefined();
  });

  it('CLI --no-gitignore wins over config `auto`+ .gitignore present', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');
    await writeFile(join(cwd, '.gitignore'), 'node_modules/\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, respectGitignore: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBeUndefined();
  });

  it('CLI --gitignore wins over config `respectGitignore: false`', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), 'respectGitignore: false\n', 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false, respectGitignore: true });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.respectGitignore).toBe(true);
  });
});
