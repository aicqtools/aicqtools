import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  injectIntoMarkdown,
  MARKER_START,
  MARKER_END,
  renderRules,
} from '../sync/render.js';
import { syncAiRules } from '../sync/sync-files.js';
import noConsoleLog from '../rules-default/no-console-log.js';
import noIdOverwrite from '../rules-default/no-id-overwrite.js';

describe('renderRules', () => {
  it('groups rules by severity (error before warning)', () => {
    const md = renderRules([noConsoleLog, noIdOverwrite], { locale: 'en' });
    const errIdx = md.indexOf('Errors');
    const warnIdx = md.indexOf('Warnings');
    expect(errIdx).toBeGreaterThanOrEqual(0);
    expect(warnIdx).toBeGreaterThan(errIdx);
  });

  it('uses Korean messages when locale is ko', () => {
    const md = renderRules([noConsoleLog], { locale: 'ko' });
    expect(md).toContain('운영 코드에서');
  });

  it('lists languages for each rule', () => {
    const md = renderRules([noConsoleLog], { locale: 'en' });
    expect(md).toContain('Languages: typescript, javascript, tsx');
  });
});

describe('injectIntoMarkdown', () => {
  it('appends block when no markers exist', () => {
    const existing = '# Project\n\nSome content.\n';
    const out = injectIntoMarkdown(existing, 'BODY\n');
    expect(out).toContain(MARKER_START);
    expect(out).toContain('BODY');
    expect(out).toContain(MARKER_END);
    expect(out.startsWith('# Project')).toBe(true);
  });

  it('replaces existing block between markers', () => {
    const existing = `# Project\n\n${MARKER_START}\nOLD\n${MARKER_END}\n\nFooter\n`;
    const out = injectIntoMarkdown(existing, 'NEW\n');
    expect(out).toContain('NEW');
    expect(out).not.toContain('OLD');
    expect(out).toContain('Footer');
  });

  it('returns just the block when input is null', () => {
    const out = injectIntoMarkdown(null, 'BODY\n');
    expect(out.startsWith(MARKER_START)).toBe(true);
    expect(out.endsWith(MARKER_END + '\n')).toBe(true);
  });
});

describe('syncAiRules', () => {
  it('writes both .cursorrules and CLAUDE.md by default', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aicq-sync-'));
    try {
      await writeFile(join(dir, 'CLAUDE.md'), '# Existing\n\nAlready here.\n', 'utf-8');
      const written = await syncAiRules([noConsoleLog], { cwd: dir, locale: 'ko' });
      expect(written).toHaveLength(2);
      const cursor = await readFile(join(dir, '.cursorrules'), 'utf-8');
      const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf-8');
      expect(cursor).toContain('no-console-log');
      expect(claude).toContain('# Existing');
      expect(claude).toContain(MARKER_START);
      expect(claude).toContain('no-console-log');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
