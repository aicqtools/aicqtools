import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { FileCache, findConfigPath, loadConfig, ParserError, reportJson, reportSarif, reportText, resolveLocale, t } from '@aicqtools/core';
import { applyRuleConfig, collectUnknownOverrideIds, loadAllBuiltinRules, loadFunctionRulesFromDir, runProject } from '@aicqtools/guardrail';
import type { Rule } from '@aicqtools/rule-sdk';
import { getCliVersion } from '../version.js';

/** When `filesScanned` exceeds this and no config exists, emit a one-line stderr advisory. */
const LARGE_SCAN_HINT_THRESHOLD = 5000;

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
  const configPath = await findConfigPath(cwd);

  const rules: Rule[] = [...(await loadAllBuiltinRules())];
  if (config.modules.guardrail.rulesDir) {
    try {
      const userRules = await loadFunctionRulesFromDir(resolve(cwd, config.modules.guardrail.rulesDir));
      rules.push(...userRules);
    } catch {
      // user rules dir is optional
    }
  }

  // Apply per-rule on/off/severity overrides from config.modules.guardrail.rules
  const { rules: effectiveRules, unknownIds } = applyRuleConfig(rules, config.modules.guardrail.rules);
  const overrides = config.modules.guardrail.overrides;
  const unknownOverrideIds = collectUnknownOverrideIds(rules, overrides);

  const cache = opts.cache !== false ? new FileCache(resolve(cwd, '.aicq/cache.sqlite')) : undefined;

  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    configLocale: config.locale,
    env: process.env,
  });

  // Warn once on stderr for any unknown rule ids in the config map (typo, renamed, removed).
  for (const id of unknownIds) {
    process.stderr.write(t(locale, 'cli.check.unknownRuleId', { id }) + '\n');
  }
  // Same surface, but for overrides — include index and matched paths so users can find the typo.
  for (const u of unknownOverrideIds) {
    process.stderr.write(
      t(locale, 'cli.check.unknownRuleIdInOverride', {
        index: String(u.index),
        id: u.id,
        paths: u.paths.join(', '),
      }) + '\n',
    );
  }

  let result;
  try {
    result = await runProject({
      cwd,
      include: config.include,
      exclude: config.exclude,
      rules: effectiveRules,
      ...(cache ? { cache } : {}),
      ...(config.respectGitignore ? { respectGitignore: true } : {}),
      ...(overrides.length > 0 ? { overrides } : {}),
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

  // Advisory: large scan with no config and no respectGitignore → most likely the user is
  // scanning build artifacts. Output goes to stderr so it never pollutes machine-consumable
  // formats (json/sarif). Never affects exit code.
  if (
    result.filesScanned > LARGE_SCAN_HINT_THRESHOLD &&
    !configPath &&
    !config.respectGitignore
  ) {
    process.stderr.write(
      t(locale, 'cli.check.largeScanHint', { files: result.filesScanned }) + '\n',
    );
  }

  let serialized: string;
  if (opts.format === 'json') serialized = reportJson(result);
  else if (opts.format === 'sarif') serialized = reportSarif(result, getCliVersion());
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
