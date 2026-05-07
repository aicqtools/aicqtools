import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Rule } from '@aicqtools/rule-sdk';
import { injectIntoMarkdown, renderRules } from './render.js';

export interface SyncTarget {
  readonly path: string;
  readonly markdown: boolean;
}

export interface SyncOptions {
  readonly cwd: string;
  readonly locale: 'ko' | 'en';
  readonly targets?: readonly SyncTarget[];
}

const DEFAULT_TARGETS: readonly SyncTarget[] = [
  { path: '.cursorrules', markdown: false },
  { path: 'CLAUDE.md', markdown: true },
];

export async function syncAiRules(rules: readonly Rule[], opts: SyncOptions): Promise<string[]> {
  const cwd = resolve(opts.cwd);
  const body = renderRules(rules, { locale: opts.locale });
  const targets = opts.targets ?? DEFAULT_TARGETS;
  const written: string[] = [];

  for (const t of targets) {
    const fullPath = resolve(cwd, t.path);
    let next: string;
    if (t.markdown) {
      const existing = existsSync(fullPath) ? await readFile(fullPath, 'utf-8') : null;
      next = injectIntoMarkdown(existing, body);
    } else {
      next = body;
    }
    await writeFile(fullPath, next, 'utf-8');
    written.push(fullPath);
  }
  return written;
}
