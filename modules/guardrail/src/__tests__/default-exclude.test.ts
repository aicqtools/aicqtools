import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aicqConfigSchema, DEFAULT_EXCLUDE } from '@aicqtools/core';
import { resolveIgnores, runProject } from '../runner/run-project.js';
import { loadAllBuiltinRules } from '../rules-default/index.js';

const fixtureCwd = fileURLToPath(new URL('./fixtures/build-artifacts-repo', import.meta.url));
const cfg = aicqConfigSchema.parse({});

describe('default `exclude` filters build artifacts (alpha.7)', () => {
  it('scans `src/**` and `database/migrations/**` but no build-artifact dirs', async () => {
    const rules = await loadAllBuiltinRules();
    const result = await runProject({
      cwd: fixtureCwd,
      include: cfg.include,
      exclude: cfg.exclude, // schema defaults
      rules,
    });
    // Build-artifact files (out/, .next/, ios/App/App/public/, android/.../assets/public/,
    // coverage/) ship a `console.log` each → 5 files. The fixture also has src/app.ts (1)
    // and database/migrations/001_init.ts (1). Default exclude must drop the 5 artifacts.
    // We count distinct file paths that produced diagnostics.
    const files = new Set(result.diagnostics.map((d) => d.file));
    const fileList = [...files].map((f) => f.replace(/\\/g, '/'));
    // Allowed:
    expect(fileList.some((f) => f.endsWith('/src/app.ts'))).toBe(true);
    expect(fileList.some((f) => f.endsWith('/database/migrations/001_init.ts'))).toBe(true);
    // Excluded:
    expect(fileList.some((f) => f.includes('/out/'))).toBe(false);
    expect(fileList.some((f) => f.includes('/.next/'))).toBe(false);
    expect(fileList.some((f) => f.includes('/ios/App/'))).toBe(false);
    expect(fileList.some((f) => f.includes('/android/app/'))).toBe(false);
    expect(fileList.some((f) => f.includes('/coverage/'))).toBe(false);
  });

  it('DEFAULT_EXCLUDE includes the new framework conventions', () => {
    expect(DEFAULT_EXCLUDE).toEqual(expect.arrayContaining([
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.next/**',
      '**/coverage/**',
      '**/ios/App/**/public/**',
      '**/android/app/src/main/assets/public/**',
      '**/__pycache__/**',
    ]));
  });

  it('does NOT exclude migrations/seeders/database directories', () => {
    const blocklist = [
      '**/migrations/**',
      '**/seeders/**',
      '**/database/**',
      '**/scripts/**',
    ];
    for (const glob of blocklist) {
      expect(DEFAULT_EXCLUDE).not.toContain(glob);
    }
  });
});

describe('resolveIgnores — `.gitignore` opt-in', () => {
  it('returns just the configured excludes when respectGitignore is false', async () => {
    const out = await resolveIgnores(fixtureCwd, ['**/node_modules/**'], false);
    expect(out).toEqual(['**/node_modules/**']);
  });

  it('appends entries from a root `.gitignore` when respectGitignore is true', async () => {
    // Write a temporary .gitignore to a sibling tmp dir to avoid mutating the fixture between runs.
    const tmp = await import('node:os').then((m) => m.tmpdir());
    const probe = join(tmp, `aicq-gi-probe-${Date.now()}`);
    await import('node:fs/promises').then((m) => m.mkdir(probe, { recursive: true }));
    await writeFile(join(probe, '.gitignore'), '# comment\ncustom-build/\n!keep-me/\n\n', 'utf-8');

    const out = await resolveIgnores(probe, ['**/node_modules/**'], true);
    expect(out).toContain('**/node_modules/**');
    // `custom-build/` (trailing slash, no slash inside) → `**/custom-build/**`
    expect(out).toContain('**/custom-build/**');
    // Negation prefix preserved
    expect(out).toContain('!**/keep-me/**');
  });

  it('falls back to the configured excludes when `.gitignore` is missing', async () => {
    const tmp = await import('node:os').then((m) => m.tmpdir());
    const probe = join(tmp, `aicq-gi-missing-${Date.now()}`);
    await import('node:fs/promises').then((m) => m.mkdir(probe, { recursive: true }));

    const out = await resolveIgnores(probe, ['**/node_modules/**'], true);
    expect(out).toEqual(['**/node_modules/**']);
  });
});
