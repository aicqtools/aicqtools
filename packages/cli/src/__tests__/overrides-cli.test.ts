import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@aicqtools/guardrail', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    runProject: vi.fn().mockResolvedValue({ diagnostics: [], filesScanned: 0, durationMs: 1 }),
    // Provide a tiny baseline so collectUnknownOverrideIds can decide what's unknown.
    loadAllBuiltinRules: vi.fn().mockResolvedValue([
      { kind: 'function', id: 'real-rule', language: 'typescript', severity: 'warning', message: '', visitors: {} },
    ]),
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
  cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-cli-'));
  mockedRunProject.mockClear();
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runCheck — overrides wiring (alpha.8)', () => {
  it('forwards a non-empty overrides array to runProject', async () => {
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["**/scripts/**"]',
      '        rules:',
      '          real-rule: off',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.overrides).toEqual([
      { paths: ['**/scripts/**'], rules: { 'real-rule': 'off' } },
    ]);
  });

  it('omits the overrides field when the config has none', async () => {
    await writeFile(join(cwd, 'aicq.config.yaml'), '', 'utf-8');
    await runCheck({ cwd, format: 'text', cache: false });
    const call = mockedRunProject.mock.calls[0]?.[0];
    expect(call?.overrides).toBeUndefined();
  });

  it('writes a per-entry stderr warning for unknown rule ids inside overrides (en)', async () => {
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["**/scripts/**"]',
      '        rules:',
      '          typo-rule: off',
      '          real-rule: warn',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', locale: 'en', cache: false });
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('overrides[0]');
    expect(stderrText).toContain('typo-rule');
    expect(stderrText).toContain('**/scripts/**');
    // The known id should NOT appear as an unknown.
    expect(stderrText).not.toContain('`real-rule`');
  });

  it('writes a per-entry stderr warning for unknown rule ids inside overrides (ko)', async () => {
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["public/native-bridge.js"]',
      '        rules:',
      '          made-up-id: off',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', locale: 'ko', cache: false });
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('overrides[0]');
    expect(stderrText).toContain('made-up-id');
    expect(stderrText).toContain('알 수 없는 룰');
  });
});
