import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig, resolveLocale, t } from '@aicqtools/core';
import type { CheckResult } from '@aicqtools/core';
import { getCliVersion } from '../version.js';
import {
  buildRecord,
  capture,
  createReader,
  emitAiBom,
  buildArticle50Report,
  renderArticle50Html,
  renderArticle50Pdf,
  writeProvenanceRecord,
} from '@aicqtools/provenance';
import type { BuildArticle50Options, ReaderName } from '@aicqtools/provenance';

export interface ProvenanceCaptureOptions {
  readonly cwd: string;
  readonly output?: string;
  readonly locale?: 'ko' | 'en';
  readonly reader?: ReaderName;
}

export async function runProvenanceCapture(opts: ProvenanceCaptureOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const config = await loadConfig(cwd);
  const locale = resolveLocale({
    ...(opts.locale ? { override: opts.locale } : {}),
    configLocale: config.locale,
    env: process.env,
  });
  const reader = createReader(opts.reader ?? 'manual');
  const result = await capture({ cwd, commitTimestamp: new Date().toISOString(), reader });
  const record = buildRecord(result);
  const outPath = resolve(cwd, opts.output ?? `aicq/provenance/${Date.now()}.json`);
  await writeProvenanceRecord(outPath, record);
  process.stdout.write(t(locale, 'cli.provenance.captured', { path: outPath }) + '\n');
  process.stdout.write(
    t(locale, 'cli.provenance.summary', {
      attributions: record.attributions.length,
      sessions: record.sessions.length,
    }) + '\n',
  );
  return 0;
}

export interface ProvenanceReportOptions {
  readonly cwd: string;
  readonly format: 'article-50' | 'article-50-html' | 'article-50-pdf' | 'ai-bom';
  readonly recordPath: string;
  readonly locale?: 'ko' | 'en';
  readonly output?: string;
  /**
   * Path to a `aicq check --format json` output. When provided with any
   * article-50 / article-50-html / article-50-pdf format, the report includes
   * a `guardrailSummary` section summarizing severity counts, rule categories,
   * and the number of files with violations. Sub 3b (beta.2) baseline: manual
   * mode — the user runs `aicq check` first; auto mode (`--include-violations`)
   * is a follow-up sub-cycle.
   */
  readonly guardrailResultPath?: string;
}

async function loadGuardrailResult(cwd: string, path: string): Promise<CheckResult> {
  const abs = resolve(cwd, path);
  const raw = await readFile(abs, 'utf-8');
  return JSON.parse(raw) as CheckResult;
}

export async function runProvenanceReport(opts: ProvenanceReportOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const path = resolve(cwd, opts.recordPath);
  const record = JSON.parse(await readFile(path, 'utf-8'));

  // Sub 3b: optionally load a guardrail CheckResult JSON to embed a summary.
  // ai-bom is unaffected (it's a different CycloneDX-shaped emit).
  const guardrail = opts.guardrailResultPath
    ? await loadGuardrailResult(cwd, opts.guardrailResultPath)
    : undefined;
  const buildOpts: BuildArticle50Options | undefined = guardrail
    ? { guardrail }
    : undefined;

  if (opts.format === 'ai-bom') {
    process.stdout.write(JSON.stringify(emitAiBom(record, getCliVersion()), null, 2) + '\n');
    return 0;
  }
  if (opts.format === 'article-50-html') {
    const config = await loadConfig(cwd);
    const locale = resolveLocale({
      ...(opts.locale ? { override: opts.locale } : {}),
      configLocale: config.locale,
      env: process.env,
    });
    process.stdout.write(renderArticle50Html(buildArticle50Report(record, buildOpts), { locale }));
    return 0;
  }
  if (opts.format === 'article-50-pdf') {
    if (!opts.output) {
      process.stderr.write('--output <path> is required for article-50-pdf format\n');
      return 1;
    }
    const config = await loadConfig(cwd);
    const locale = resolveLocale({
      ...(opts.locale ? { override: opts.locale } : {}),
      configLocale: config.locale,
      env: process.env,
    });
    const pdf = await renderArticle50Pdf(buildArticle50Report(record, buildOpts), { locale });
    const outPath = resolve(cwd, opts.output);
    await writeFile(outPath, pdf);
    process.stdout.write(`PDF written: ${outPath}\n`);
    return 0;
  }
  process.stdout.write(JSON.stringify(buildArticle50Report(record, buildOpts), null, 2) + '\n');
  return 0;
}
