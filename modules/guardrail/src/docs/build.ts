import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Rule } from '@aicqtools/rule-sdk';
import { renderRuleMarkdown, renderRulesIndex } from './render-rule-md.js';

export interface BuildDocsOptions {
  readonly cwd: string;
  readonly outDir: string;
  readonly rules: readonly Rule[];
}

export interface BuildDocsResult {
  readonly outDir: string;
  readonly files: number;
}

export async function buildRuleDocs(opts: BuildDocsOptions): Promise<BuildDocsResult> {
  const out = resolve(opts.cwd, opts.outDir);
  const dirs = {
    ko: join(out, 'rules', 'ko'),
    en: join(out, 'rules', 'en'),
  } as const;

  await mkdir(dirs.ko, { recursive: true });
  await mkdir(dirs.en, { recursive: true });

  let files = 0;
  for (const rule of opts.rules) {
    await writeFile(join(dirs.ko, `${rule.id}.md`), renderRuleMarkdown(rule, 'ko'), 'utf-8');
    await writeFile(join(dirs.en, `${rule.id}.md`), renderRuleMarkdown(rule, 'en'), 'utf-8');
    files += 2;
  }

  await writeFile(join(dirs.ko, 'index.md'), renderRulesIndex(opts.rules, 'ko'), 'utf-8');
  await writeFile(join(dirs.en, 'index.md'), renderRulesIndex(opts.rules, 'en'), 'utf-8');
  files += 2;

  return { outDir: out, files };
}
