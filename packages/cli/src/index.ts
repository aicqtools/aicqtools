import { Command } from 'commander';
import { runCheck } from './commands/check.js';
import { getCliVersion } from './version.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('aicq')
    .description('AI Code Quality Platform — guardrail engine and provenance tracker')
    .version(getCliVersion());

  program
    .command('check')
    .description('Run guardrail rules against the project')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('-f, --format <format>', 'output format (text|json|sarif)', 'text')
    .option('-o, --output <path>', 'write report to file instead of stdout')
    .option('--locale <locale>', 'message locale (ko|en)')
    .option('--no-cache', 'disable incremental sqlite cache')
    .option('--gitignore', 'force-enable reading the root .gitignore (overrides config)')
    .option('--no-gitignore', 'force-disable reading the root .gitignore (overrides config)')
    .option(
      '--skip-builtin-skips',
      'bypass built-in SKIP_FILE_RE guards in default rules (alpha.13, overrides config)',
    )
    .option(
      '--no-skip-builtin-skips',
      'enforce built-in SKIP_FILE_RE guards in default rules (alpha.13, overrides config)',
    )
    .option(
      '--report-unused-suppressions',
      'emit @aicq/unused-suppression info diagnostics for aicq-disable-* directives that matched zero violations (alpha.17, overrides config)',
    )
    .option(
      '--no-report-unused-suppressions',
      'suppress @aicq/unused-suppression info diagnostics (alpha.17, overrides config)',
    )
    .action(
      async (opts: {
        cwd: string;
        format: string;
        output?: string;
        locale?: string;
        cache: boolean;
        gitignore?: boolean;
        skipBuiltinSkips?: boolean;
        reportUnusedSuppressions?: boolean;
      }) => {
        const format = (['text', 'json', 'sarif'] as const).find((f) => f === opts.format) ?? 'text';
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const code = await runCheck({
          cwd: opts.cwd,
          format,
          ...(opts.output !== undefined ? { output: opts.output } : {}),
          ...(locale !== undefined ? { locale } : {}),
          cache: opts.cache,
          ...(opts.gitignore !== undefined ? { respectGitignore: opts.gitignore } : {}),
          ...(opts.skipBuiltinSkips !== undefined ? { skipBuiltinSkips: opts.skipBuiltinSkips } : {}),
          ...(opts.reportUnusedSuppressions !== undefined
            ? { reportUnusedSuppressions: opts.reportUnusedSuppressions }
            : {}),
        });
        process.exit(code);
      },
    );

  const provenance = program
    .command('provenance')
    .description('AI code provenance commands (capture, report)');

  provenance
    .command('capture')
    .description('Capture provenance from staged git changes + active AI session')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('-o, --output <path>', 'output JSON path (default: aicq/provenance/<ts>.json)')
    .option('--locale <locale>', 'message locale (ko|en)')
    .option(
      '--reader <name>',
      'session reader (manual|claude-code|cursor|all)',
      'manual',
    )
    .action(
      async (opts: { cwd: string; output?: string; locale?: string; reader: string }) => {
        const { runProvenanceCapture } = await import('./commands/provenance.js');
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const reader =
          opts.reader === 'claude-code' || opts.reader === 'cursor' || opts.reader === 'all'
            ? opts.reader
            : 'manual';
        const code = await runProvenanceCapture({
          cwd: opts.cwd,
          ...(opts.output !== undefined ? { output: opts.output } : {}),
          ...(locale !== undefined ? { locale } : {}),
          reader,
        });
        process.exit(code);
      },
    );

  provenance
    .command('report')
    .description('Render a compliance report from a captured provenance record')
    .argument('<record>', 'path to a captured provenance JSON file')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option(
      '-f, --format <format>',
      'report format (article-50|article-50-html|article-50-pdf|ai-bom)',
      'article-50',
    )
    .option('--locale <locale>', 'message locale for HTML/PDF output (ko|en)')
    .option('-o, --output <path>', 'output file (required for article-50-pdf)')
    .action(
      async (
        record: string,
        opts: { cwd: string; format: string; locale?: string; output?: string },
      ) => {
        const { runProvenanceReport } = await import('./commands/provenance.js');
        const format =
          opts.format === 'ai-bom'
            ? 'ai-bom'
            : opts.format === 'article-50-html'
              ? 'article-50-html'
              : opts.format === 'article-50-pdf'
                ? 'article-50-pdf'
                : 'article-50';
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const code = await runProvenanceReport({
          cwd: opts.cwd,
          format,
          recordPath: record,
          ...(locale !== undefined ? { locale } : {}),
          ...(opts.output !== undefined ? { output: opts.output } : {}),
        });
        process.exit(code);
      },
    );

  program
    .command('mcp')
    .description('Start MCP server over stdio for Claude Code / Cursor integration')
    .action(async () => {
      const { runMcpStdio } = await import('./commands/mcp.js');
      await runMcpStdio();
    });

  program
    .command('sync-ai-rules')
    .description('Generate / refresh .cursorrules and CLAUDE.md from loaded rules')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('--locale <locale>', 'message locale (ko|en)')
    .action(async (opts: { cwd: string; locale?: string }) => {
      const { runSyncAiRules } = await import('./commands/sync-ai-rules.js');
      const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
      const code = await runSyncAiRules({
        cwd: opts.cwd,
        ...(locale !== undefined ? { locale } : {}),
      });
      process.exit(code);
    });

  const docs = program
    .command('docs')
    .description('Documentation tooling (rule pages, etc.)');

  docs
    .command('build')
    .description('Generate per-rule markdown docs (ko + en)')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('-o, --out <path>', 'output directory', 'aicq-docs')
    .option('--locale <locale>', 'message locale (ko|en) — affects status message only')
    .action(async (opts: { cwd: string; out: string; locale?: string }) => {
      const { runDocsBuild } = await import('./commands/docs.js');
      const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
      const code = await runDocsBuild({
        cwd: opts.cwd,
        out: opts.out,
        ...(locale !== undefined ? { locale } : {}),
      });
      process.exit(code);
    });

  const rules = program
    .command('rules')
    .description('Rule analysis and suggestion commands');

  rules
    .command('suggest')
    .description('Analyze the repo and suggest project-specific rules (early prototype)')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('-f, --format <format>', 'output format (text|json|yaml)', 'text')
    .option('-o, --output <path>', 'write report to file instead of stdout')
    .option('--locale <locale>', 'message locale (ko|en)')
    .option('--top <n>', 'max rule suggestions', '10')
    .option('--min-hits <n>', 'minimum violations for a rule to be suggested', '1')
    .option('--patterns', 'also mine AST patterns into draft YAML pattern rules (experimental)')
    .option('--min-pattern-count <n>', 'minimum occurrences for a mined pattern', '5')
    .option('--no-cache', 'disable incremental sqlite cache')
    .action(
      async (opts: {
        cwd: string;
        format: string;
        output?: string;
        locale?: string;
        top: string;
        minHits: string;
        patterns?: boolean;
        minPatternCount: string;
        cache: boolean;
      }) => {
        const { runRulesSuggest } = await import('./commands/rules-suggest.js');
        const format = (['text', 'json', 'yaml'] as const).find((f) => f === opts.format) ?? 'text';
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const top = Number.parseInt(opts.top, 10);
        const minHits = Number.parseInt(opts.minHits, 10);
        const minPatternCount = Number.parseInt(opts.minPatternCount, 10);
        const code = await runRulesSuggest({
          cwd: opts.cwd,
          format,
          ...(opts.output !== undefined ? { output: opts.output } : {}),
          ...(locale !== undefined ? { locale } : {}),
          ...(Number.isFinite(top) ? { top } : {}),
          ...(Number.isFinite(minHits) ? { minHits } : {}),
          ...(opts.patterns ? { patterns: true } : {}),
          ...(Number.isFinite(minPatternCount) ? { minPatternCount } : {}),
          cache: opts.cache,
        });
        process.exit(code);
      },
    );

  return program;
}
