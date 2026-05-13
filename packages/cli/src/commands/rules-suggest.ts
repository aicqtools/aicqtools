import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { FileCache, loadConfig, ParserError, resolveLocale, t } from '@aicqtools/core';
import {
  analyzeRepo,
  formatSuggestText,
  formatSuggestYaml,
  loadAllBuiltinRules,
  minePatterns,
} from '@aicqtools/guardrail';
import type { RuleSuggestionReport } from '@aicqtools/guardrail';
import type { Rule } from '@aicqtools/rule-sdk';

export interface RulesSuggestOptions {
  readonly cwd: string;
  readonly format: 'text' | 'json' | 'yaml';
  readonly output?: string;
  readonly locale?: 'ko' | 'en';
  readonly cache?: boolean;
  readonly top?: number;
  readonly minHits?: number;
  readonly patterns?: boolean;
  readonly minPatternCount?: number;
}

export async function runRulesSuggest(opts: RulesSuggestOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const config = await loadConfig(cwd);
  const rules: Rule[] = [...(await loadAllBuiltinRules())];
  const cache = opts.cache !== false ? new FileCache(resolve(cwd, '.aicq/cache.sqlite')) : undefined;
  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    configLocale: config.locale,
    env: process.env,
  });

  let report: RuleSuggestionReport;
  try {
    report = await analyzeRepo({
      cwd,
      include: config.include,
      exclude: config.exclude,
      rules,
      ...(cache ? { cache } : {}),
      ...(opts.top !== undefined ? { top: opts.top } : {}),
      ...(opts.minHits !== undefined ? { minHits: opts.minHits } : {}),
      ...(config.respectGitignore ? { respectGitignore: true } : {}),
    });
    if (opts.patterns) {
      const patternDrafts = await minePatterns({
        cwd,
        include: config.include,
        exclude: config.exclude,
        ...(opts.minPatternCount !== undefined ? { minCount: opts.minPatternCount } : {}),
        ...(config.respectGitignore ? { respectGitignore: true } : {}),
      });
      report = { ...report, patternDrafts };
    }
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
  if (opts.format === 'json') serialized = JSON.stringify(report, null, 2);
  else if (opts.format === 'yaml') serialized = formatSuggestYaml(report, locale);
  else serialized = formatSuggestText(report, locale);

  if (opts.output) {
    await writeFile(resolve(cwd, opts.output), serialized + '\n', 'utf-8');
    process.stdout.write(
      pc.green(t(locale, 'cli.rules.suggest.written', { count: report.suggestions.length, path: opts.output })) + '\n',
    );
  } else {
    process.stdout.write(serialized + '\n');
  }
  return 0;
}
