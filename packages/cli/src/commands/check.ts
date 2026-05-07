import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { FileCache, loadConfig, reportJson, reportSarif, reportText } from '@aicq/core';
import { loadAllBuiltinRules, loadFunctionRulesFromDir, runProject } from '@aicq/guardrail';
import type { Rule } from '@aicq/rule-sdk';

export interface CheckOptions {
  readonly cwd: string;
  readonly format: 'text' | 'json' | 'sarif';
  readonly output?: string;
  readonly locale?: 'ko' | 'en';
  readonly cache?: boolean;
}

export async function runCheck(opts: CheckOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const config = await loadConfig(cwd);

  const rules: Rule[] = [...(await loadAllBuiltinRules())];
  if (config.modules.guardrail.rulesDir) {
    try {
      const userRules = await loadFunctionRulesFromDir(resolve(cwd, config.modules.guardrail.rulesDir));
      rules.push(...userRules);
    } catch {
      // user rules dir is optional
    }
  }

  const cache = opts.cache !== false ? new FileCache(resolve(cwd, '.aicq/cache.sqlite')) : undefined;
  let result;
  try {
    result = await runProject({
      cwd,
      include: config.include,
      exclude: config.exclude,
      rules,
      ...(cache ? { cache } : {}),
    });
  } finally {
    cache?.close();
  }

  const locale = opts.locale ?? config.locale;

  let serialized: string;
  if (opts.format === 'json') serialized = reportJson(result);
  else if (opts.format === 'sarif') serialized = reportSarif(result);
  else serialized = reportText(result, locale);

  if (opts.output) {
    await writeFile(resolve(cwd, opts.output), serialized, 'utf-8');
  } else if (opts.format === 'text') {
    process.stdout.write(serialized + '\n');
    if (result.diagnostics.length > 0) {
      process.stdout.write(pc.red(`\n${result.diagnostics.length} violations found.\n`));
    } else {
      process.stdout.write(pc.green(`\nNo violations.\n`));
    }
  } else {
    process.stdout.write(serialized + '\n');
  }

  const hasErrors = result.diagnostics.some((d) => d.severity === 'error');
  return hasErrors ? 1 : 0;
}
