import { resolve } from 'node:path';
import { loadConfig, resolveLocale, t } from '@aicqtools/core';
import { buildRuleDocs, loadAllBuiltinRules, loadFunctionRulesFromDir } from '@aicqtools/guardrail';
import type { Rule } from '@aicqtools/rule-sdk';

export interface DocsBuildOptions {
  readonly cwd: string;
  readonly out: string;
  readonly locale?: 'ko' | 'en';
}

export async function runDocsBuild(opts: DocsBuildOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const config = await loadConfig(cwd);
  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    configLocale: config.locale,
    env: process.env,
  });

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

  const { outDir, files } = await buildRuleDocs({
    cwd,
    outDir: opts.out,
    rules,
  });

  process.stdout.write(t(locale, 'cli.docs.generated', { count: files, dir: outDir }) + '\n');
  return 0;
}
