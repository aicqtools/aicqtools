import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Rule } from '@aicqtools/rule-sdk';
import type { RuleOverride } from '@aicqtools/core';
import {
  applyOverridesForFile,
  collectUnknownOverrideIds,
} from '../runner/apply-rule-config.js';
import { runProject } from '../runner/run-project.js';

function fakeRule(id: string, severity: Rule['severity']): Rule {
  return {
    kind: 'function',
    id,
    language: 'typescript',
    severity,
    message: id,
    visitors: {},
  };
}

const baseline: readonly Rule[] = [
  fakeRule('alpha', 'error'),
  fakeRule('beta', 'warning'),
  fakeRule('gamma', 'info'),
];

describe('applyOverridesForFile — per-file rule resolution (alpha.8)', () => {
  it('returns the baseline unchanged when overrides is empty (fast path)', () => {
    expect(applyOverridesForFile(baseline, [], 'src/x.ts')).toBe(baseline);
  });

  it('returns the baseline unchanged when no override path matches', () => {
    const ov: RuleOverride[] = [{ paths: ['**/scripts/**'], rules: { alpha: 'off' } }];
    const out = applyOverridesForFile(baseline, ov, 'src/app.ts');
    expect(out).toBe(baseline);
  });

  it('drops a rule whose level is `off` for a matched file', () => {
    const ov: RuleOverride[] = [{ paths: ['**/scripts/**'], rules: { alpha: 'off' } }];
    const out = applyOverridesForFile(baseline, ov, 'src/scripts/build.ts');
    const ids = out.map((r) => r.id);
    expect(ids).toEqual(['beta', 'gamma']);
  });

  it('overrides severity (warn/error) for a matched file', () => {
    const ov: RuleOverride[] = [{ paths: ['public/native-bridge.js'], rules: { gamma: 'error' } }];
    const out = applyOverridesForFile(baseline, ov, 'public/native-bridge.js');
    const g = out.find((r) => r.id === 'gamma');
    expect(g?.severity).toBe('error');
  });

  it('honors last-write-wins when multiple entries match the same rule', () => {
    const ov: RuleOverride[] = [
      { paths: ['**/scripts/**'], rules: { alpha: 'warn' } },
      { paths: ['**/scripts/build.ts'], rules: { alpha: 'off' } },
    ];
    const out = applyOverridesForFile(baseline, ov, 'src/scripts/build.ts');
    // Second entry says `off` — alpha should be gone.
    expect(out.find((r) => r.id === 'alpha')).toBeUndefined();
  });

  it('matches Windows-style backslash paths', () => {
    const ov: RuleOverride[] = [{ paths: ['**/scripts/**'], rules: { alpha: 'off' } }];
    const out = applyOverridesForFile(baseline, ov, 'src\\scripts\\build.ts');
    expect(out.find((r) => r.id === 'alpha')).toBeUndefined();
  });

  it('preserves the discriminated `kind` after severity override', () => {
    const ov: RuleOverride[] = [{ paths: ['x.ts'], rules: { beta: 'error' } }];
    const out = applyOverridesForFile(baseline, ov, 'x.ts');
    expect(out.find((r) => r.id === 'beta')?.kind).toBe('function');
  });
});

describe('collectUnknownOverrideIds — typo surface', () => {
  it('returns an empty list when overrides is empty', () => {
    expect(collectUnknownOverrideIds(baseline, [])).toEqual([]);
  });

  it('returns nothing when every referenced id is known', () => {
    const ov: RuleOverride[] = [{ paths: ['x'], rules: { alpha: 'off', beta: 'warn' } }];
    expect(collectUnknownOverrideIds(baseline, ov)).toEqual([]);
  });

  it('reports unknown ids paired with their override index and paths', () => {
    const ov: RuleOverride[] = [
      { paths: ['**/scripts/**'], rules: { 'no-such-rule': 'off' } },
      { paths: ['x.ts', 'y.ts'], rules: { 'typo-rule': 'warn', alpha: 'off' } },
    ];
    const out = collectUnknownOverrideIds(baseline, ov);
    expect(out).toEqual([
      { index: 0, id: 'no-such-rule', paths: ['**/scripts/**'] },
      { index: 1, id: 'typo-rule', paths: ['x.ts', 'y.ts'] },
    ]);
  });
});

describe('runProject — overrides integration', () => {
  // Use a tiny no-console-log style rule so we can verify on/off behavior end-to-end.
  function flagAllStrings(id: string): Rule {
    return {
      kind: 'function',
      id,
      language: 'typescript',
      severity: 'warning',
      message: id,
      visitors: {
        string(node, ctx) {
          ctx.report({ node });
        },
      },
    };
  }

  it('applies overrides per file so a matched path drops the rule', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-'));
    try {
      await mkdir(join(cwd, 'src', 'scripts'), { recursive: true });
      await writeFile(join(cwd, 'src', 'app.ts'), 'const x = "hello";\n', 'utf-8');
      await writeFile(join(cwd, 'src', 'scripts', 'build.ts'), 'const y = "world";\n', 'utf-8');

      const rule = flagAllStrings('flag-strings');
      const overrides: RuleOverride[] = [
        { paths: ['**/scripts/**'], rules: { 'flag-strings': 'off' } },
      ];

      const result = await runProject({
        cwd,
        include: ['**/*.ts'],
        exclude: ['**/node_modules/**'],
        rules: [rule],
        overrides,
      });
      const files = new Set(result.diagnostics.map((d) => d.file.replace(/\\/g, '/')));
      expect([...files].some((f) => f.endsWith('/src/app.ts'))).toBe(true);
      expect([...files].some((f) => f.endsWith('/scripts/build.ts'))).toBe(false);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('applies severity override (warn → error) for a matched file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-sev-'));
    try {
      await writeFile(join(cwd, 'a.ts'), 'const x = "y";\n', 'utf-8');
      const rule = flagAllStrings('flag-strings');
      // Match the file via `**/a.ts` rather than the basename — fast-glob returns absolute paths,
      // so a bare `a.ts` glob would miss them. This mirrors how a user would write the override.
      const overrides: RuleOverride[] = [
        { paths: ['**/a.ts'], rules: { 'flag-strings': 'error' } },
      ];
      const result = await runProject({
        cwd,
        include: ['**/*.ts'],
        exclude: [],
        rules: [rule],
        overrides,
      });
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.every((d) => d.severity === 'error')).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
