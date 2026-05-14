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

describe('runCheck — overrides unmatched-paths stderr (alpha.10)', () => {
  it('emits a per-entry stderr warning when an override matched zero files (en)', async () => {
    // runProject is mocked at module top to return overrideMatchCounts so we can test the
    // CLI emit path in isolation.
    mockedRunProject.mockResolvedValueOnce({
      diagnostics: [],
      filesScanned: 1,
      durationMs: 1,
      overrideMatchCounts: [0],
    });
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["nonexistent/**"]',
      '        rules:',
      '          real-rule: off',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', locale: 'en', cache: false });
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('overrides[0]');
    expect(stderrText).toContain('nonexistent/**');
    expect(stderrText).toContain('matched no files');
  });

  it('emits a per-entry stderr warning when an override matched zero files (ko)', async () => {
    mockedRunProject.mockResolvedValueOnce({
      diagnostics: [],
      filesScanned: 1,
      durationMs: 1,
      overrideMatchCounts: [0],
    });
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["does-not-exist/**"]',
      '        rules:',
      '          real-rule: off',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', locale: 'ko', cache: false });
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('overrides[0]');
    expect(stderrText).toContain('does-not-exist/**');
    expect(stderrText).toContain('어떤 파일에도 매치되지 않음');
  });

  it('stays silent when every override entry matched at least one file', async () => {
    mockedRunProject.mockResolvedValueOnce({
      diagnostics: [],
      filesScanned: 5,
      durationMs: 1,
      overrideMatchCounts: [3, 2],
    });
    const cfg = [
      'modules:',
      '  guardrail:',
      '    overrides:',
      '      - paths: ["**/scripts/**"]',
      '        rules:',
      '          real-rule: off',
      '      - paths: ["**/*.config.ts"]',
      '        rules:',
      '          real-rule: warn',
      '',
    ].join('\n');
    await writeFile(join(cwd, 'aicq.config.yaml'), cfg, 'utf-8');

    await runCheck({ cwd, format: 'text', locale: 'en', cache: false });
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).not.toContain('matched no files');
  });
});
