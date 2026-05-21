import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { FileCache, findConfigPath, loadConfig, ParserError, reportJson, reportSarif, reportText, resolveLocale, t } from '@aicqtools/core';
import { applyRuleConfig, collectNegationPaths, collectUnknownOverrideIds, loadAllBuiltinRules, loadFunctionRulesFromDir, runProject } from '@aicqtools/guardrail';
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
  /**
   * CLI override for `respectGitignore`. `true` forces the walker to honor `.gitignore`,
   * `false` forces it to skip the file. `undefined` defers to config (which itself may be
   * `'auto'`, in which case the presence of a root `.gitignore` decides).
   */
  readonly respectGitignore?: boolean;
  /**
   * CLI override for `skipBuiltinSkips` (alpha.13). `true` bypasses built-in `SKIP_FILE_RE`
   * guards in default rules; `false` enforces them. `undefined` defers to config (default
   * `false`).
   */
  readonly skipBuiltinSkips?: boolean;
  /**
   * CLI override for `reportUnusedSuppressions` (alpha.17). `true` emits
   * `@aicq/unused-suppression` info diagnostics for directives that matched zero violations;
   * `false` keeps the report quiet. `undefined` defers to config (default `false`).
   */
  readonly reportUnusedSuppressions?: boolean;
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
  const { rules: effectiveRules, unknownIds, ruleOptions, unknownOptions, optionParseErrors } =
    applyRuleConfig(rules, config.modules.guardrail.rules);
  const overrides = config.modules.guardrail.overrides;
  const unknownOverrideIds = collectUnknownOverrideIds(rules, overrides);
  const negationPaths = collectNegationPaths(overrides);

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
  // Alpha.11: surface negation patterns inside overrides.paths — they're silently no-op'd by
  // micromatch.isMatch's array OR semantics, so a user writing ESLint-style `!src/app.ts`
  // would otherwise get no signal. One stderr line per offending entry, pointing at `exclude:`.
  for (const n of negationPaths) {
    process.stderr.write(
      t(locale, 'cli.check.overridePathsNegationUnsupported', {
        index: String(n.index),
        paths: n.paths.join(', '),
      }) + '\n',
    );
  }
  // Alpha.14: per-rule options framework — surface unknown option keys (typos) and zod parse
  // failures. Same exit-code-stays-0 pattern as unknown rule ids: the rule still runs with
  // its declared defaults so a config bug never crashes the scan.
  for (const u of unknownOptions) {
    process.stderr.write(
      t(locale, 'cli.check.unknownRuleOptionKey', {
        ruleId: u.ruleId,
        keys: u.unknownKeys.join(', '),
      }) + '\n',
    );
  }
  for (const [ruleId, error] of optionParseErrors) {
    process.stderr.write(
      t(locale, 'cli.check.ruleOptionParseError', { ruleId, error }) + '\n',
    );
  }

  // Resolve `respectGitignore` precedence: explicit CLI flag > config boolean > config 'auto'.
  // 'auto' enables only when a root `.gitignore` is present so the default is friendly without
  // surprising users whose repos genuinely have no .gitignore.
  let respectGitignore: boolean;
  if (opts.respectGitignore !== undefined) {
    respectGitignore = opts.respectGitignore;
  } else if (config.respectGitignore === 'auto') {
    respectGitignore = existsSync(resolve(cwd, '.gitignore'));
  } else {
    respectGitignore = config.respectGitignore;
  }

  // Alpha.13 escape hatch: explicit CLI flag > config boolean (default false).
  const skipBuiltinSkips =
    opts.skipBuiltinSkips !== undefined ? opts.skipBuiltinSkips : config.skipBuiltinSkips;

  // Alpha.17 opt-in: explicit CLI flag > config boolean (default false). Mirrors alpha.13.
  const reportUnusedSuppressions =
    opts.reportUnusedSuppressions !== undefined
      ? opts.reportUnusedSuppressions
      : config.reportUnusedSuppressions;

  let result;
  try {
    result = await runProject({
      cwd,
      include: config.include,
      exclude: config.exclude,
      rules: effectiveRules,
      ...(cache ? { cache } : {}),
      ...(respectGitignore ? { respectGitignore: true } : {}),
      ...(overrides.length > 0 ? { overrides } : {}),
      ...(skipBuiltinSkips ? { skipBuiltinSkips: true } : {}),
      ...(ruleOptions.size > 0 ? { ruleOptions } : {}),
      ...(reportUnusedSuppressions ? { reportUnusedSuppressions: true } : {}),
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

  // Per-entry "matched no files" warnings (alpha.10). Mirrors `unknownRuleIdInOverride`
  // in surface and tone — a dead override entry surfaces immediately rather than silently
  // no-op'ing. Skipped when overrides is empty (no counts produced).
  const counts = result.overrideMatchCounts;
  if (counts && overrides.length > 0) {
    for (let i = 0; i < overrides.length; i++) {
      const ov = overrides[i];
      if (!ov) continue;
      if ((counts[i] ?? 0) === 0) {
        process.stderr.write(
          t(locale, 'cli.check.overridePathsNoMatch', {
            index: String(i),
            paths: ov.paths.join(', '),
          }) + '\n',
        );
      }
    }
  }

  // Advisory: large scan with no config and no respectGitignore → most likely the user is
  // scanning build artifacts. Output goes to stderr so it never pollutes machine-consumable
  // formats (json/sarif). Never affects exit code.
  if (
    result.filesScanned > LARGE_SCAN_HINT_THRESHOLD &&
    !configPath &&
    !respectGitignore
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
