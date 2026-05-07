import { resolve } from 'node:path';
import {
  buildRecord,
  capture,
  emitAiBom,
  buildArticle50Report,
  writeProvenanceRecord,
} from '@aicqtools/provenance';

export interface ProvenanceCaptureOptions {
  readonly cwd: string;
  readonly output?: string;
}

export async function runProvenanceCapture(opts: ProvenanceCaptureOptions): Promise<number> {
  const cwd = resolve(opts.cwd);
  const result = await capture({ cwd, commitTimestamp: new Date().toISOString() });
  const record = buildRecord(result);
  const outPath = resolve(cwd, opts.output ?? `aicq/provenance/${Date.now()}.json`);
  await writeProvenanceRecord(outPath, record);
  process.stdout.write(`provenance captured: ${outPath}\n`);
  process.stdout.write(`  ${record.attributions.length} attribution(s), ${record.sessions.length} session(s)\n`);
  return 0;
}

export interface ProvenanceReportOptions {
  readonly cwd: string;
  readonly format: 'article-50' | 'ai-bom';
  readonly recordPath: string;
}

export async function runProvenanceReport(opts: ProvenanceReportOptions): Promise<number> {
  const { readFile } = await import('node:fs/promises');
  const cwd = resolve(opts.cwd);
  const path = resolve(cwd, opts.recordPath);
  const record = JSON.parse(await readFile(path, 'utf-8'));
  if (opts.format === 'ai-bom') {
    process.stdout.write(JSON.stringify(emitAiBom(record), null, 2) + '\n');
  } else {
    process.stdout.write(JSON.stringify(buildArticle50Report(record), null, 2) + '\n');
  }
  return 0;
}
