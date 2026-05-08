import { Command } from 'commander';
import { runCheck } from './commands/check.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('aicq')
    .description('AI Code Quality Platform — guardrail engine and provenance tracker')
    .version('0.0.0');

  program
    .command('check')
    .description('Run guardrail rules against the project')
    .option('-C, --cwd <path>', 'project root', process.cwd())
    .option('-f, --format <format>', 'output format (text|json|sarif)', 'text')
    .option('-o, --output <path>', 'write report to file instead of stdout')
    .option('--locale <locale>', 'message locale (ko|en)')
    .option('--no-cache', 'disable incremental sqlite cache')
    .action(
      async (opts: { cwd: string; format: string; output?: string; locale?: string; cache: boolean }) => {
        const format = (['text', 'json', 'sarif'] as const).find((f) => f === opts.format) ?? 'text';
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const code = await runCheck({
          cwd: opts.cwd,
          format,
          ...(opts.output !== undefined ? { output: opts.output } : {}),
          ...(locale !== undefined ? { locale } : {}),
          cache: opts.cache,
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
      'report format (article-50|article-50-html|ai-bom)',
      'article-50',
    )
    .option('--locale <locale>', 'message locale for HTML output (ko|en)')
    .action(
      async (record: string, opts: { cwd: string; format: string; locale?: string }) => {
        const { runProvenanceReport } = await import('./commands/provenance.js');
        const format =
          opts.format === 'ai-bom'
            ? 'ai-bom'
            : opts.format === 'article-50-html'
              ? 'article-50-html'
              : 'article-50';
        const locale = opts.locale === 'ko' || opts.locale === 'en' ? opts.locale : undefined;
        const code = await runProvenanceReport({
          cwd: opts.cwd,
          format,
          recordPath: record,
          ...(locale !== undefined ? { locale } : {}),
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

  return program;
}
