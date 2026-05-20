import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@aicqtools/guardrail', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const { z } = await import('zod');
  const { defineRule } = await import('@aicqtools/rule-sdk');
  const DEFAULTS = ['0', '1', '-1', '2', '-2', '10', '16', '24', '60', '100', '1000', '1024'];
  const fakeNoMagicNumber = defineRule({
    id: 'no-magic-number',
    language: 'typescript',
    severity: 'info',
    message: 'magic number',
    options: {
      schema: z
        .object({
          allowedNumbers: z.array(z.string()).default([...DEFAULTS]),
        })
        .strict(),
      defaults: { allowedNumbers: [...DEFAULTS] },
    },
    visitors: {},
  });
  return {
    ...actual,
    runProject: vi.fn().mockResolvedValue({ diagnostics: [], filesScanned: 0, durationMs: 1 }),
    loadAllBuiltinRules: vi.fn().mockResolvedValue([fakeNoMagicNumber]),
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
  cwd = await mkdtemp(join(tmpdir(), 'aicq-rule-options-cli-'));
  mockedRunProject.mockClear();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runCheck — per-rule options precedence + warnings (alpha.14)', () => {
  it('object-shape config entry forwards ruleOptions into runProject', async () => {
    const yaml = `
modules:
  guardrail:
    rules:
      no-magic-number:
        options:
          allowedNumbers: ['7', '13']
`;
    await writeFile(join(cwd, 'aicq.config.yaml'), yaml, 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.ruleOptions).toBeDefined();
    const opts = call?.ruleOptions?.get('no-magic-number') as
      | { allowedNumbers: readonly string[] }
      | undefined;
    expect(opts?.allowedNumbers).toEqual(['7', '13']);
  });

  it('unknown option key triggers stderr warning but does not change exit code', async () => {
    const yaml = `
modules:
  guardrail:
    rules:
      no-magic-number:
        options:
          allowedNumberz: ['7']
`;
    await writeFile(join(cwd, 'aicq.config.yaml'), yaml, 'utf-8');

    const exitCode = await runCheck({ cwd, format: 'text', cache: false });
    expect(exitCode).toBe(0);

    const stderrCalls = stderrSpy.mock.calls.flat().join('');
    expect(stderrCalls).toContain('no-magic-number');
    expect(stderrCalls).toContain('allowedNumberz');
  });

  it('zod schema violation (wrong type) triggers stderr warning + falls back to defaults', async () => {
    const yaml = `
modules:
  guardrail:
    rules:
      no-magic-number:
        options:
          allowedNumbers: not-an-array
`;
    await writeFile(join(cwd, 'aicq.config.yaml'), yaml, 'utf-8');

    const exitCode = await runCheck({ cwd, format: 'text', cache: false });
    expect(exitCode).toBe(0);

    const stderrCalls = stderrSpy.mock.calls.flat().join('');
    expect(stderrCalls).toMatch(/no-magic-number/);
  });
});
