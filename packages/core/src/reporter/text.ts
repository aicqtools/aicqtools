import type { CheckResult, Diagnostic, Severity } from '../types.js';

const severityLabel: Record<Severity, string> = {
  error: 'error',
  warning: 'warn ',
  info: 'info ',
};

function formatDiagnostic(d: Diagnostic, locale: 'ko' | 'en'): string {
  const message = locale === 'ko' && d.messageKo ? d.messageKo : d.message;
  const loc = `${d.file}:${d.range.start.line}:${d.range.start.column}`;
  return `  ${severityLabel[d.severity]}  ${loc}  ${d.ruleId}\n         ${message}`;
}

export function reportText(result: CheckResult, locale: 'ko' | 'en' = 'en'): string {
  const lines: string[] = [];
  for (const d of result.diagnostics) {
    lines.push(formatDiagnostic(d, locale));
  }
  const summary = locale === 'ko'
    ? `\n파일 ${result.filesScanned}개 검사, 위반 ${result.diagnostics.length}개, ${result.durationMs}ms 소요`
    : `\n${result.filesScanned} files scanned, ${result.diagnostics.length} violations, ${result.durationMs}ms`;
  lines.push(summary);
  return lines.join('\n');
}
