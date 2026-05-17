import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Rule } from '@aicqtools/rule-sdk';
import type { RuleOverride } from '@aicqtools/core';
import {
  applyOverridesForFile,
  collectNegationPaths,
  collectUnknownOverrideIds,
  normalizeOverridePath,
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

describe('collectNegationPaths — negation footgun surface (alpha.11)', () => {
  it('returns an empty list when no entry has a negation pattern', () => {
    const ov: RuleOverride[] = [
      { paths: ['**/scripts/**', 'public/native-bridge.js'], rules: { alpha: 'off' } },
    ];
    expect(collectNegationPaths(ov)).toEqual([]);
  });

  it('returns an empty list when overrides is empty (fast path)', () => {
    expect(collectNegationPaths([])).toEqual([]);
  });

  it('reports a single entry with one negation glob', () => {
    const ov: RuleOverride[] = [
      { paths: ['src/**', '!src/app.ts'], rules: { alpha: 'off' } },
    ];
    expect(collectNegationPaths(ov)).toEqual([
      { index: 0, paths: ['!src/app.ts'] },
    ]);
  });

  it('reports multiple entries with multiple negation globs', () => {
    const ov: RuleOverride[] = [
      { paths: ['**/*.ts', '!vendor/**', '!**/legacy/**'], rules: { alpha: 'off' } },
      { paths: ['scripts/**'], rules: { beta: 'off' } },
      { paths: ['!third-party/**'], rules: { gamma: 'warn' } },
    ];
    expect(collectNegationPaths(ov)).toEqual([
      { index: 0, paths: ['!vendor/**', '!**/legacy/**'] },
      { index: 2, paths: ['!third-party/**'] },
    ]);
  });

  it('detects negation even when leading `**/` is already present after `!`', () => {
    const ov: RuleOverride[] = [
      { paths: ['!**/vendor/**'], rules: { alpha: 'off' } },
    ];
    expect(collectNegationPaths(ov)).toEqual([
      { index: 0, paths: ['!**/vendor/**'] },
    ]);
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

describe('normalizeOverridePath — auto-anchor (alpha.10)', () => {
  it('prepends **/ to bare globs', () => {
    expect(normalizeOverridePath('scripts/**')).toBe('**/scripts/**');
    expect(normalizeOverridePath('public/native-bridge.js')).toBe('**/public/native-bridge.js');
    expect(normalizeOverridePath('*.config.ts')).toBe('**/*.config.ts');
  });

  it('is idempotent when the glob already starts with **', () => {
    expect(normalizeOverridePath('**/scripts/**')).toBe('**/scripts/**');
    expect(normalizeOverridePath('**')).toBe('**');
    expect(normalizeOverridePath('**/*.ts')).toBe('**/*.ts');
  });

  it('leaves Unix absolute paths alone', () => {
    expect(normalizeOverridePath('/abs/path/**')).toBe('/abs/path/**');
  });

  it('leaves Windows drive-letter paths alone', () => {
    expect(normalizeOverridePath('C:/foo/**')).toBe('C:/foo/**');
    expect(normalizeOverridePath('D:/AI/Projects/x/**')).toBe('D:/AI/Projects/x/**');
  });

  it('preserves negation while anchoring the body', () => {
    expect(normalizeOverridePath('!vendor/**')).toBe('!**/vendor/**');
    expect(normalizeOverridePath('!**/vendor/**')).toBe('!**/vendor/**');
    expect(normalizeOverridePath('!/abs/**')).toBe('!/abs/**');
  });

  it('accepts brace expansion at the start by treating the brace as non-anchor', () => {
    // `{src,public}/scripts/**` becomes `**/{src,public}/scripts/**`. micromatch consumes it fine.
    expect(normalizeOverridePath('{src,public}/scripts/**')).toBe('**/{src,public}/scripts/**');
  });

  it('returns empty input untouched', () => {
    expect(normalizeOverridePath('')).toBe('');
    expect(normalizeOverridePath('!')).toBe('!');
  });
});

describe('applyOverridesForFile — auto-anchored matching (alpha.10)', () => {
  it('matches a bare `scripts/**` against an absolute-path file (alpha.9 silent no-op fixed)', () => {
    const ov: RuleOverride[] = [{ paths: ['scripts/**'], rules: { alpha: 'off' } }];
    const out = applyOverridesForFile(baseline, ov, '/repo/src/scripts/build.ts');
    expect(out.find((r) => r.id === 'alpha')).toBeUndefined();
  });

  it('produces the same result whether user wrote `scripts/**` or `**/scripts/**`', () => {
    const file = '/repo/src/scripts/build.ts';
    const shortForm = applyOverridesForFile(
      baseline,
      [{ paths: ['scripts/**'], rules: { alpha: 'off' } }],
      file,
    );
    const longForm = applyOverridesForFile(
      baseline,
      [{ paths: ['**/scripts/**'], rules: { alpha: 'off' } }],
      file,
    );
    expect(shortForm.map((r) => r.id)).toEqual(longForm.map((r) => r.id));
  });

  it('treats Unix absolute paths as anchored — `/repo/...` matches only that prefix', () => {
    const ov: RuleOverride[] = [{ paths: ['/repo/src/scripts/**'], rules: { alpha: 'off' } }];
    expect(applyOverridesForFile(baseline, ov, '/repo/src/scripts/build.ts').find((r) => r.id === 'alpha')).toBeUndefined();
    expect(applyOverridesForFile(baseline, ov, '/other/scripts/build.ts').find((r) => r.id === 'alpha')).toBeDefined();
  });

  it('accumulates per-entry match counts when the optional array is passed', () => {
    const ov: RuleOverride[] = [
      { paths: ['scripts/**'], rules: { alpha: 'off' } },
      { paths: ['nonexistent/**'], rules: { beta: 'off' } },
    ];
    const counts = [0, 0];
    applyOverridesForFile(baseline, ov, '/repo/src/scripts/build.ts', counts);
    applyOverridesForFile(baseline, ov, '/repo/src/scripts/test.ts', counts);
    applyOverridesForFile(baseline, ov, '/repo/src/app.ts', counts);
    expect(counts).toEqual([2, 0]);
  });
});

describe('runProject — overrideMatchCounts surfaces dead entries (alpha.10)', () => {
  it('reports zero for an entry that matched no files', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-counts-'));
    try {
      await writeFile(join(cwd, 'a.ts'), 'const x = "y";\n', 'utf-8');
      const rule = fakeRule('flag-strings', 'warning');
      const overrides: RuleOverride[] = [
        { paths: ['scripts/**'], rules: { 'flag-strings': 'off' } },
        { paths: ['nonexistent/**'], rules: { 'flag-strings': 'off' } },
      ];
      const result = await runProject({
        cwd,
        include: ['**/*.ts'],
        exclude: [],
        rules: [rule],
        overrides,
      });
      expect(result.overrideMatchCounts).toEqual([0, 0]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('counts matches across multiple files for a live entry', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-counts-live-'));
    try {
      await mkdir(join(cwd, 'src', 'scripts'), { recursive: true });
      await writeFile(join(cwd, 'src', 'app.ts'), 'const x = "y";\n', 'utf-8');
      await writeFile(join(cwd, 'src', 'scripts', 'a.ts'), 'const y = "z";\n', 'utf-8');
      await writeFile(join(cwd, 'src', 'scripts', 'b.ts'), 'const z = "w";\n', 'utf-8');
      const rule = fakeRule('flag-strings', 'warning');
      const overrides: RuleOverride[] = [
        { paths: ['scripts/**'], rules: { 'flag-strings': 'off' } },
      ];
      const result = await runProject({
        cwd,
        include: ['**/*.ts'],
        exclude: [],
        rules: [rule],
        overrides,
      });
      expect(result.overrideMatchCounts?.[0]).toBe(2);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('omits the field entirely when no overrides are configured (fast path)', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'aicq-overrides-fastpath-'));
    try {
      await writeFile(join(cwd, 'a.ts'), 'const x = 1;\n', 'utf-8');
      const result = await runProject({
        cwd,
        include: ['**/*.ts'],
        exclude: [],
        rules: [fakeRule('alpha', 'warning')],
      });
      expect(result.overrideMatchCounts).toBeUndefined();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
