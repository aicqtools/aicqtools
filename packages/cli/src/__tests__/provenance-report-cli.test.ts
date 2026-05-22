import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProvenanceReport } from '../commands/provenance.js';

const baseRecord = {
  version: '0.1',
  sessions: [
    {
      sessionId: 's-001',
      tool: 'claude-code',
      model: 'claude-opus-4-7',
      modelVersion: '2.1.132',
      startedAt: '2026-05-21T03:00:00Z',
    },
  ],
  prompts: [],
  attributions: [
    {
      filePath: 'src/index.ts',
      startLine: 1,
      endLine: 10,
      sessionId: 's-001',
      humanEdited: false,
    },
  ],
  capturedAt: '2026-05-21T03:05:00Z',
};

const baseGuardrailResult = {
  diagnostics: [
    {
      ruleId: 'no-magic-number',
      severity: 'info',
      message: 'magic number',
      file: 'src/index.ts',
      range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
    },
    {
      ruleId: 'route-needs-auth',
      severity: 'error',
      message: 'route missing auth',
      file: 'src/api.ts',
      range: { start: { line: 2, column: 1 }, end: { line: 2, column: 5 } },
    },
  ],
  filesScanned: 7,
  durationMs: 100,
};

let cwd: string;
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stdoutCapture: string;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'aicq-cli-prov-test-'));
  await writeFile(join(cwd, 'aicq.config.yaml'), 'locale: en\n', 'utf-8');
  stdoutCapture = '';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    stdoutCapture += String(chunk);
    return true;
  });
});

afterEach(async () => {
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runProvenanceReport — Sub 3b --guardrail-result integration', () => {
  it('omits guardrailSummary when --guardrail-result is not provided (backward compatible)', async () => {
    const recordPath = join(cwd, 'record.json');
    await writeFile(recordPath, JSON.stringify(baseRecord), 'utf-8');

    const code = await runProvenanceReport({
      cwd,
      format: 'article-50',
      recordPath,
    });
    expect(code).toBe(0);

    const out = JSON.parse(stdoutCapture);
    expect(out.format).toBe('aicq-article50/0.1');
    expect(out.guardrailSummary).toBeUndefined();
  });

  it('includes guardrailSummary when --guardrail-result <path> is provided', async () => {
    const recordPath = join(cwd, 'record.json');
    const guardrailPath = join(cwd, 'check.json');
    await writeFile(recordPath, JSON.stringify(baseRecord), 'utf-8');
    await writeFile(guardrailPath, JSON.stringify(baseGuardrailResult), 'utf-8');

    const code = await runProvenanceReport({
      cwd,
      format: 'article-50',
      recordPath,
      guardrailResultPath: guardrailPath,
    });
    expect(code).toBe(0);

    const out = JSON.parse(stdoutCapture);
    expect(out.format).toBe('aicq-article50/0.1');
    expect(out.guardrailSummary).toBeDefined();
    expect(out.guardrailSummary.totalViolations).toBe(2);
    expect(out.guardrailSummary.severityCount.info).toBe(1);
    expect(out.guardrailSummary.severityCount.error).toBe(1);
    expect(out.guardrailSummary.severityCount.warning).toBe(0);
    expect(out.guardrailSummary.categoryCount['no-magic-number']).toBe(1);
    expect(out.guardrailSummary.categoryCount['route-needs-auth']).toBe(1);
    expect(out.guardrailSummary.filesWithViolations).toBe(2);
  });

  it('ai-bom format is unaffected by --guardrail-result option', async () => {
    const recordPath = join(cwd, 'record.json');
    const guardrailPath = join(cwd, 'check.json');
    await writeFile(recordPath, JSON.stringify(baseRecord), 'utf-8');
    await writeFile(guardrailPath, JSON.stringify(baseGuardrailResult), 'utf-8');

    const code = await runProvenanceReport({
      cwd,
      format: 'ai-bom',
      recordPath,
      guardrailResultPath: guardrailPath,
    });
    expect(code).toBe(0);

    const out = JSON.parse(stdoutCapture);
    // CycloneDX shape — no `guardrailSummary` field by definition.
    expect(out.guardrailSummary).toBeUndefined();
  });

  it('accepts relative guardrail-result path (resolved against cwd)', async () => {
    const recordPath = join(cwd, 'record.json');
    await writeFile(recordPath, JSON.stringify(baseRecord), 'utf-8');
    await writeFile(join(cwd, 'check.json'), JSON.stringify(baseGuardrailResult), 'utf-8');

    const code = await runProvenanceReport({
      cwd,
      format: 'article-50',
      recordPath,
      guardrailResultPath: 'check.json', // relative
    });
    expect(code).toBe(0);

    const out = JSON.parse(stdoutCapture);
    expect(out.guardrailSummary?.totalViolations).toBe(2);
  });
});
