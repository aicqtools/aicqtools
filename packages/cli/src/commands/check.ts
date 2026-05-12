import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { FileCache, loadConfig, ParserError, reportJson, reportSarif, reportText, resolveLocale, t } from '@aicqtools/core';
import { loadAllBuiltinRules, loadFunctionRulesFromDir, runProject } from '@aicqtools/guardrail';
import type { Rule } from '@aicqtools/rule-sdk';

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

  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    configLocale: config.locale,
    env: process.env,
  });

  let result;
  try {
    result = await runProject({
      cwd,
      include: config.include,
      exclude: config.exclude,
      rules,
      ...(cache ? { cache } : {}),
    });
  } catch (err) {
    if (err instanceof ParserError) {
      process.stderr.write(
        t(locale, 'cli.check.parserFailed', { file: err.filePath, message: err.cause.message }) + '\n',
      );
      return 2;
    }
    throw err;
  } finally {
    cache?.close();
  }

  let serialized: string;
  if (opts.format === 'json') serialized = reportJson(result);
  else if (opts.format === 'sarif') serialized = reportSarif(result);
  else serialized = reportText(result, locale);

  if (opts.output) {
    await writeFile(resolve(cwd, opts.output), serialized, 'utf-8');
  } else if (opts.format === 'text') {
    process.stdout.write(serialized + '\n');
    if (result.diagnostics.length > 0) {
      process.stdout.write(
        pc.red('\n' + t(locale, 'cli.check.violationsFound', { count: result.diagnostics.length }) + '\n'),
      );
    } else {
      process.stdout.write(pc.green('\n' + t(locale, 'cli.check.noViolations') + '\n'));
    }
  } else {
    process.stdout.write(serialized + '\n');
  }

  const hasErrors = result.diagnostics.some((d) => d.severity === 'error');
  return hasErrors ? 1 : 0;
}
