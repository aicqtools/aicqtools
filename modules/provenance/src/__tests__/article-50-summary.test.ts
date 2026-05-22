import { describe, expect, it } from 'vitest';
import type { CheckResult } from '@aicqtools/core';
import {
  buildArticle50Report,
  summarizeGuardrail,
} from '../reporter/article-50.js';
import type { ProvenanceRecord } from '../types.js';

const baseRecord: ProvenanceRecord = {
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
    {
      filePath: 'src/utils.ts',
      startLine: 1,
      endLine: 5,
      sessionId: 's-001',
      humanEdited: true,
    },
  ],
  capturedAt: '2026-05-21T03:05:00Z',
};

const makeDiag = (
  ruleId: string,
  severity: CheckResult['diagnostics'][number]['severity'],
  file: string,
) => ({
  ruleId,
  severity,
  message: `${ruleId} fired`,
  file,
  range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } },
});

describe('summarizeGuardrail', () => {
  it('counts severities, ruleIds, and files', () => {
    const result: CheckResult = {
      diagnostics: [
        makeDiag('no-magic-number', 'info', 'src/a.ts'),
        makeDiag('no-magic-number', 'info', 'src/b.ts'),
        makeDiag('route-needs-auth', 'error', 'src/a.ts'),
        makeDiag('no-console-log', 'warning', 'src/c.ts'),
      ],
      filesScanned: 10,
      durationMs: 123,
    };

    const summary = summarizeGuardrail(result);

    expect(summary.totalViolations).toBe(4);
    expect(summary.severityCount).toEqual({ error: 1, warning: 1, info: 2 });
    expect(summary.categoryCount).toEqual({
      'no-magic-number': 2,
      'route-needs-auth': 1,
      'no-console-log': 1,
    });
    expect(summary.filesWithViolations).toBe(3); // a.ts, b.ts, c.ts
  });

  it('handles empty diagnostics', () => {
    const result: CheckResult = {
      diagnostics: [],
      filesScanned: 7,
      durationMs: 50,
    };

    const summary = summarizeGuardrail(result);

    expect(summary.totalViolations).toBe(0);
    expect(summary.severityCount).toEqual({ error: 0, warning: 0, info: 0 });
    expect(summary.categoryCount).toEqual({});
    expect(summary.filesWithViolations).toBe(0);
  });

  it('deduplicates files across multiple diagnostics in the same file', () => {
    const result: CheckResult = {
      diagnostics: [
        makeDiag('no-magic-number', 'info', 'src/x.ts'),
        makeDiag('no-magic-number', 'info', 'src/x.ts'),
        makeDiag('route-needs-auth', 'error', 'src/x.ts'),
      ],
      filesScanned: 1,
      durationMs: 10,
    };

    const summary = summarizeGuardrail(result);
    expect(summary.filesWithViolations).toBe(1);
    expect(summary.totalViolations).toBe(3);
  });
});

describe('buildArticle50Report — guardrail integration (beta.2 Sub 3a)', () => {
  it('omits guardrailSummary when options is absent (backward compatible)', () => {
    const report = buildArticle50Report(baseRecord);
    expect(report.format).toBe('aicq-article50/0.1');
    expect(report.guardrailSummary).toBeUndefined();
  });

  it('omits guardrailSummary when options.guardrail is absent', () => {
    const report = buildArticle50Report(baseRecord, {});
    expect(report.guardrailSummary).toBeUndefined();
  });

  it('includes guardrailSummary when options.guardrail is provided', () => {
    const result: CheckResult = {
      diagnostics: [
        makeDiag('mask-pii-in-ai-prompt', 'error', 'src/a.ts'),
        makeDiag('no-direct-openai', 'error', 'src/b.ts'),
      ],
      filesScanned: 5,
      durationMs: 80,
    };

    const report = buildArticle50Report(baseRecord, { guardrail: result });

    expect(report.format).toBe('aicq-article50/0.1');
    expect(report.guardrailSummary).toBeDefined();
    expect(report.guardrailSummary?.totalViolations).toBe(2);
    expect(report.guardrailSummary?.severityCount.error).toBe(2);
    expect(report.guardrailSummary?.filesWithViolations).toBe(2);
    expect(report.guardrailSummary?.categoryCount['mask-pii-in-ai-prompt']).toBe(1);
  });

  it('preserves schema 0.1 format string regardless of guardrail option', () => {
    const reportWithout = buildArticle50Report(baseRecord);
    const reportWith = buildArticle50Report(baseRecord, {
      guardrail: { diagnostics: [], filesScanned: 0, durationMs: 0 },
    });
    expect(reportWithout.format).toBe('aicq-article50/0.1');
    expect(reportWith.format).toBe('aicq-article50/0.1');
  });
});
