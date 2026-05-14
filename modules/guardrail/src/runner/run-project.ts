import fastGlob from 'fast-glob';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CheckResult, Diagnostic, RuleOverride } from '@aicqtools/core';
import { FileCache, hashRulesetSignature } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { applyOverridesForFile } from './apply-rule-config.js';
import { runFile } from './run-file.js';
import { rulesetSignature } from './ruleset-signature.js';

export interface RunProjectOptions {
  readonly cwd: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly rules: readonly Rule[];
  readonly cache?: FileCache;
  /**
   * When true, the file walker appends entries from the repo-root `.gitignore` to the effective
   * exclude list. Unreadable / missing / malformed `.gitignore` is silently ignored (never throws).
   * Defaults to false to keep behavior deterministic across projects.
   */
  readonly respectGitignore?: boolean;
  /**
   * Per-path rule overrides (alpha.8). When set, each file's rule set is re-resolved against
   * matching `overrides` entries on top of the globally-resolved `rules` baseline. Empty array
   * (or omitted) is the fast path — runner falls back to the baseline list unchanged.
   */
  readonly overrides?: readonly RuleOverride[];
}

export async function runProject(opts: RunProjectOptions): Promise<CheckResult> {
  const start = Date.now();
  const ignore = await resolveIgnores(opts.cwd, opts.exclude, opts.respectGitignore ?? false);
  const files = await fastGlob([...opts.include], {
    cwd: opts.cwd,
    ignore,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });

  const cache = opts.cache;
  const overrides = opts.overrides ?? [];
  // Per-entry match counters (alpha.10). Allocated only when overrides is non-empty so the
  // unused-feature fast path stays allocation-free. Slots that remain 0 after the scan are
  // reported by the CLI as "matched no files — ignored." warnings.
  const matchCounts: number[] | undefined =
    overrides.length > 0 ? new Array(overrides.length).fill(0) : undefined;
  // The ruleset hash mixes in the overrides shape so cache entries invalidate when a user adds,
  // removes, or edits override paths/rules. Without this, a stale entry could survive a config
  // change that should have flipped a diagnostic on or off.
  const rulesHash = cache
    ? hashRulesetSignature([
        ...rulesetSignature(opts.rules),
        'overrides=' + JSON.stringify(overrides),
      ])
    : '';
  const diagnostics: Diagnostic[] = [];

  for (const file of files) {
    try {
      const fileRules = applyOverridesForFile(opts.rules, overrides, file, matchCounts);
      if (cache) {
        const st = await stat(file);
        const cached = cache.get({
          filePath: file,
          mtime: Math.floor(st.mtimeMs),
          size: st.size,
          rulesHash,
        });
        if (cached) {
          diagnostics.push(...cached);
          continue;
        }
        const result = await runFile(file, fileRules);
        cache.set(
          { filePath: file, mtime: Math.floor(st.mtimeMs), size: st.size, rulesHash },
          result.diagnostics,
        );
        diagnostics.push(...result.diagnostics);
      } else {
        const result = await runFile(file, fileRules);
        diagnostics.push(...result.diagnostics);
      }
    } catch (err) {
      // Per-file isolation: a parser crash or rule throw on one file must not abort the whole run.
      // Skip cache.set on failure so the next run retries instead of caching the error.
      diagnostics.push(parseFailedDiagnostic(file, err));
    }
  }

  return {
    diagnostics,
    filesScanned: files.length,
    durationMs: Date.now() - start,
    ...(matchCounts ? { overrideMatchCounts: matchCounts } : {}),
  };
}

/**
 * Build the final ignore list for `fast-glob`. Always starts from the configured `exclude`;
 * when `respectGitignore` is true, parses the root `.gitignore` (best-effort) and appends its
 * entries. Negation (`!pattern`) and trailing-slash directory entries are honored.
 */
export async function resolveIgnores(
  cwd: string,
  exclude: readonly string[],
  respectGitignore: boolean,
): Promise<string[]> {
  const ignores = [...exclude];
  if (!respectGitignore) return ignores;
  try {
    const gitignorePath = resolve(cwd, '.gitignore');
    const st = await stat(gitignorePath);
    if (!st.isFile()) return ignores;
    const text = await readFile(gitignorePath, 'utf-8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.length === 0 || line.startsWith('#')) continue;
      // We intentionally don't try to fully emulate gitignore semantics — just translate the
      // common shapes into fast-glob globs. Anything we can't reason about we leave as-is.
      const negated = line.startsWith('!');
      const body = (negated ? line.slice(1) : line).trim();
      if (body.length === 0) continue;
      // Directory entry like `out/` → `**/out/**`
      const cleaned = body.replace(/\/$/, '');
      const glob = cleaned.includes('/') ? cleaned : `**/${cleaned}/**`;
      ignores.push(negated ? `!${glob}` : glob);
    }
  } catch {
    // `.gitignore` missing / unreadable / not a regular file — fall through with static excludes.
  }
  return ignores;
}

function parseFailedDiagnostic(file: string, err: unknown): Diagnostic {
  const message = err instanceof Error ? err.message : String(err);
  return {
    ruleId: '@aicq/parse-failed',
    severity: 'warning',
    message: `parser failed during file parse: ${message}`,
    messageKo: `파서 실패 (파일 파싱 단계): ${message}`,
    file,
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
  };
}
