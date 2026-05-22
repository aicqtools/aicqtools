import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveLocale, t } from '@aicqtools/core';

export const SUPPORTED_STACKS = ['next', 'nest', 'capacitor', 'generic'] as const;
export type Stack = (typeof SUPPORTED_STACKS)[number];

export function isStack(value: string): value is Stack {
  return (SUPPORTED_STACKS as readonly string[]).includes(value);
}

export interface InitOptions {
  readonly cwd: string;
  readonly stack: Stack;
  readonly force: boolean;
  readonly workflow: boolean;
  readonly locale?: 'ko' | 'en';
}

export async function runInit(opts: InitOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    env: process.env,
  });

  const configPath = resolve(cwd, 'aicq.config.yaml');
  const workflowPath = resolve(cwd, '.github', 'workflows', 'aicq-check.yml');

  const conflicts: string[] = [];
  if (existsSync(configPath)) conflicts.push('aicq.config.yaml');
  if (opts.workflow && existsSync(workflowPath)) conflicts.push('.github/workflows/aicq-check.yml');

  if (conflicts.length > 0 && !opts.force) {
    process.stderr.write(
      t(locale, 'cli.init.conflict', { paths: conflicts.join(', ') }) + '\n',
    );
    return 1;
  }

  const written: string[] = [];

  await writeFile(configPath, renderConfig(opts.stack, locale), 'utf-8');
  written.push('aicq.config.yaml');

  if (opts.workflow) {
    await mkdir(dirname(workflowPath), { recursive: true });
    await writeFile(workflowPath, renderWorkflow(opts.stack, locale), 'utf-8');
    written.push('.github/workflows/aicq-check.yml');
  }

  for (const p of written) {
    process.stdout.write(t(locale, 'cli.init.wrote', { path: p }) + '\n');
  }
  process.stdout.write(t(locale, 'cli.init.nextStep', { stack: opts.stack }) + '\n');
  return 0;
}

function renderConfig(stack: Stack, locale: 'ko' | 'en'): string {
  const header =
    locale === 'ko'
      ? `# aicq.config.yaml — \`aicq init --stack ${stack}\`으로 생성됨.\n# 전체 schema는 https://github.com/aicqtools/aicqtools를 참고하세요.\n`
      : `# aicq.config.yaml — scaffolded by \`aicq init --stack ${stack}\`.\n# Full schema: https://github.com/aicqtools/aicqtools\n`;

  const localeLine = `locale: ${locale}\n`;

  const blocks: Record<Stack, string> = {
    next:
      'exclude:\n' +
      "  - '.next/**'\n" +
      "  - 'out/**'\n" +
      "  - 'public/**'\n" +
      "  - '**/__generated__/**'\n" +
      '\n' +
      'overrides:\n' +
      "  - paths: ['**/scripts/**', '**/tools/**']\n" +
      '    rules:\n' +
      '      no-console-log: off\n' +
      "  - paths: ['**/app/api/**', '**/pages/api/**']\n" +
      '    rules:\n' +
      '      no-magic-number: off  # HTTP status codes are noise here\n',
    nest:
      'exclude:\n' +
      "  - 'dist/**'\n" +
      "  - 'coverage/**'\n" +
      "  - '**/__generated__/**'\n" +
      '\n' +
      'overrides:\n' +
      "  - paths: ['**/migrations/**', '**/seeders/**']\n" +
      '    rules:\n' +
      '      no-magic-number: off\n' +
      "  - paths: ['**/*.spec.ts', '**/*.e2e-spec.ts']\n" +
      '    rules:\n' +
      '      no-console-log: off\n',
    capacitor:
      'exclude:\n' +
      "  - 'ios/**'\n" +
      "  - 'android/**'\n" +
      "  - 'www/**'\n" +
      "  - 'public/native-bridge.*'\n" +
      "  - 'dist/**'\n" +
      '\n' +
      'overrides:\n' +
      "  - paths: ['**/scripts/**']\n" +
      '    rules:\n' +
      '      no-console-log: off\n',
    generic:
      'exclude:\n' +
      "  - 'dist/**'\n" +
      "  - 'build/**'\n" +
      "  - 'coverage/**'\n",
  };

  return header + localeLine + '\n' + blocks[stack] + '\n';
}

function renderWorkflow(stack: Stack, locale: 'ko' | 'en'): string {
  const comment =
    locale === 'ko'
      ? `# .github/workflows/aicq-check.yml — \`aicq init --stack ${stack}\`으로 생성됨.\n`
      : `# .github/workflows/aicq-check.yml — scaffolded by \`aicq init --stack ${stack}\`.\n`;
  return (
    comment +
    `name: aicq check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  aicq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install --no-save @aicqtools/cli@beta
      - run: npx aicq check --format sarif --output aicq-report.sarif
        continue-on-error: true
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: aicq-report.sarif
`
  );
}
