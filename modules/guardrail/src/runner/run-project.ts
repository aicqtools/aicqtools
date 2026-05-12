import fastGlob from 'fast-glob';
import { stat } from 'node:fs/promises';
import type { CheckResult, Diagnostic } from '@aicqtools/core';
import { FileCache, hashRulesetSignature } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { runFile } from './run-file.js';
import { rulesetSignature } from './ruleset-signature.js';

export interface RunProjectOptions {
  readonly cwd: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly rules: readonly Rule[];
  readonly cache?: FileCache;
}

export async function runProject(opts: RunProjectOptions): Promise<CheckResult> {
  const start = Date.now();
  const files = await fastGlob([...opts.include], {
    cwd: opts.cwd,
    ignore: [...opts.exclude],
    absolute: true,
    onlyFiles: true,
    dot: false,
  });

  const cache = opts.cache;
  const rulesHash = cache ? hashRulesetSignature(rulesetSignature(opts.rules)) : '';
  const diagnostics: Diagnostic[] = [];

  for (const file of files) {
    try {
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
        const result = await runFile(file, opts.rules);
        cache.set(
          { filePath: file, mtime: Math.floor(st.mtimeMs), size: st.size, rulesHash },
          result.diagnostics,
        );
        diagnostics.push(...result.diagnostics);
      } else {
        const result = await runFile(file, opts.rules);
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
  };
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
