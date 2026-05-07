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
    if (cache) {
      try {
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
          {
            filePath: file,
            mtime: Math.floor(st.mtimeMs),
            size: st.size,
            rulesHash,
          },
          result.diagnostics,
        );
        diagnostics.push(...result.diagnostics);
        continue;
      } catch {
        // fall through to non-cached path
      }
    }
    const result = await runFile(file, opts.rules);
    diagnostics.push(...result.diagnostics);
  }

  return {
    diagnostics,
    filesScanned: files.length,
    durationMs: Date.now() - start,
  };
}
