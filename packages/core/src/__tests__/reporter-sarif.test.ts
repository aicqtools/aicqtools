import { describe, it, expect } from 'vitest';
import { reportSarif } from '../reporter/sarif.js';
import type { CheckResult, Diagnostic } from '../types.js';

function makeDiag(file: string, ruleId: string): Diagnostic {
  return {
    ruleId,
    severity: 'warning',
    message: `parser failed: Invalid argument`,
    messageKo: `파서 실패: Invalid argument`,
    file,
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
  };
}

describe('reportSarif — @aicq/parse-failed', () => {
  it('serializes multiple parse-failed diagnostics into one rule + N results', () => {
    const result: CheckResult = {
      diagnostics: [
        makeDiag('/x/CharacterForm.tsx', '@aicq/parse-failed'),
        makeDiag('/x/RegisterForm.tsx', '@aicq/parse-failed'),
      ],
      filesScanned: 2,
      durationMs: 10,
    };
    const log = JSON.parse(reportSarif(result));
    expect(log.version).toBe('2.1.0');
    const rules = log.runs[0].tool.driver.rules;
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('@aicq/parse-failed');
    expect(log.runs[0].results).toHaveLength(2);
    expect(log.runs[0].results.every((r: { level: string }) => r.level === 'warning')).toBe(true);
  });
});
