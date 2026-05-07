import { resolve } from 'node:path';
import { loadConfig } from '@aicqtools/core';
import { loadAllBuiltinRules, loadFunctionRulesFromDir, syncAiRules } from '@aicqtools/guardrail';
import type { Rule } from '@aicqtools/rule-sdk';

export interface SyncAiRulesOptions {
  readonly cwd: string;
  readonly locale?: 'ko' | 'en';
}

export async function runSyncAiRules(opts: SyncAiRulesOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const config = await loadConfig(cwd);

  const rules: Rule[] = [...(await loadAllBuiltinRules())];
  if (config.modules.guardrail.rulesDir) {
    try {
      const userRules = await loadFunctionRulesFromDir(
        resolve(cwd, config.modules.guardrail.rulesDir),
      );
      rules.push(...userRules);
    } catch {
      // optional
    }
  }

  const written = await syncAiRules(rules, {
    cwd,
    locale: opts.locale ?? config.locale,
  });
  for (const path of written) {
    process.stdout.write(`updated: ${path}\n`);
  }
  return 0;
}
