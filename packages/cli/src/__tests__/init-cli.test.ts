import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { runInit, SUPPORTED_STACKS, isStack } from '../commands/init.js';

let cwd: string;
let stderrSpy: ReturnType<typeof vi.spyOn>;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'aicq-init-cli-'));
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stderrSpy.mockRestore();
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runInit — basic scaffolding (beta.1)', () => {
  it('writes aicq.config.yaml and .github/workflows/aicq-check.yml for --stack next', async () => {
    const code = await runInit({
      cwd,
      stack: 'next',
      force: false,
      workflow: true,
      locale: 'en',
    });
    expect(code).toBe(0);

    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).toContain('.next/**');
    expect(config).toContain('app/api/**');
    expect(config).toContain('locale: en');

    const workflow = await readFile(
      resolve(cwd, '.github', 'workflows', 'aicq-check.yml'),
      'utf-8',
    );
    expect(workflow).toContain('name: aicq check');
    expect(workflow).toContain('@aicqtools/cli@beta');
    expect(workflow).toContain('upload-sarif@v3');
  });

  it('writes a generic config when no Next/Nest/Capacitor hints requested', async () => {
    const code = await runInit({
      cwd,
      stack: 'generic',
      force: false,
      workflow: true,
      locale: 'en',
    });
    expect(code).toBe(0);

    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).toContain("'dist/**'");
    expect(config).toContain("'build/**'");
    expect(config).not.toContain('.next/**');
    expect(config).not.toContain('android/**');
  });

  it('skips the workflow file when --no-workflow', async () => {
    const code = await runInit({
      cwd,
      stack: 'nest',
      force: false,
      workflow: false,
      locale: 'en',
    });
    expect(code).toBe(0);

    expect(existsSync(resolve(cwd, 'aicq.config.yaml'))).toBe(true);
    expect(existsSync(resolve(cwd, '.github', 'workflows', 'aicq-check.yml'))).toBe(false);
  });

  it('refuses to overwrite an existing aicq.config.yaml without --force (stderr + exit 1)', async () => {
    await writeFile(resolve(cwd, 'aicq.config.yaml'), '# pre-existing\n', 'utf-8');

    const code = await runInit({
      cwd,
      stack: 'next',
      force: false,
      workflow: true,
      locale: 'en',
    });
    expect(code).toBe(1);

    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('refusing to overwrite');
    expect(stderrText).toContain('aicq.config.yaml');

    // Original content is preserved
    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).toBe('# pre-existing\n');
  });

  it('overwrites with --force when files exist', async () => {
    await writeFile(resolve(cwd, 'aicq.config.yaml'), '# pre-existing\n', 'utf-8');

    const code = await runInit({
      cwd,
      stack: 'next',
      force: true,
      workflow: true,
      locale: 'en',
    });
    expect(code).toBe(0);

    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).not.toBe('# pre-existing\n');
    expect(config).toContain('.next/**');
  });

  it('also detects an existing workflow file as a conflict', async () => {
    await mkdir(resolve(cwd, '.github', 'workflows'), { recursive: true });
    await writeFile(
      resolve(cwd, '.github', 'workflows', 'aicq-check.yml'),
      '# pre-existing workflow\n',
      'utf-8',
    );

    const code = await runInit({
      cwd,
      stack: 'capacitor',
      force: false,
      workflow: true,
      locale: 'en',
    });
    expect(code).toBe(1);
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('aicq-check.yml');

    // Original workflow content untouched, config not written
    const workflow = await readFile(
      resolve(cwd, '.github', 'workflows', 'aicq-check.yml'),
      'utf-8',
    );
    expect(workflow).toBe('# pre-existing workflow\n');
    expect(existsSync(resolve(cwd, 'aicq.config.yaml'))).toBe(false);
  });

  it('writes Korean header when --locale ko', async () => {
    const code = await runInit({
      cwd,
      stack: 'generic',
      force: false,
      workflow: false,
      locale: 'ko',
    });
    expect(code).toBe(0);

    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).toContain('생성됨');
    expect(config).toContain('locale: ko');

    const stdoutText = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stdoutText).toContain('작성됨');
    expect(stdoutText).toContain('다음 단계');
  });

  it('emits Capacitor-specific exclude patterns', async () => {
    const code = await runInit({
      cwd,
      stack: 'capacitor',
      force: false,
      workflow: false,
      locale: 'en',
    });
    expect(code).toBe(0);

    const config = await readFile(resolve(cwd, 'aicq.config.yaml'), 'utf-8');
    expect(config).toContain('ios/**');
    expect(config).toContain('android/**');
    expect(config).toContain('native-bridge');
  });
});

describe('isStack — input validation', () => {
  it('accepts only the four known stacks', () => {
    expect(isStack('next')).toBe(true);
    expect(isStack('nest')).toBe(true);
    expect(isStack('capacitor')).toBe(true);
    expect(isStack('generic')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isStack('react-native')).toBe(false);
    expect(isStack('')).toBe(false);
    expect(isStack('NEXT')).toBe(false);
  });

  it('exposes exactly the four supported stacks via SUPPORTED_STACKS', () => {
    expect([...SUPPORTED_STACKS]).toEqual(['next', 'nest', 'capacitor', 'generic']);
  });
});
