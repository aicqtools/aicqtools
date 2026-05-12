import { readFile } from 'node:fs/promises';
import type { Diagnostic, Language } from '@aicqtools/core';
import { detectLanguage, parseSource } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { runRule } from './run-rule.js';

export interface RunFileResult {
  readonly filePath: string;
  readonly language: Language | null;
  readonly diagnostics: readonly Diagnostic[];
}

export async function runFile(filePath: string, rules: readonly Rule[]): Promise<RunFileResult> {
  const language = detectLanguage(filePath);
  if (!language) return { filePath, language: null, diagnostics: [] };

  const source = await readFile(filePath, 'utf-8');
  return runFileWithSource(filePath, source, language, rules);
}

export function runFileWithSource(
  filePath: string,
  source: string,
  language: Language,
  rules: readonly Rule[],
): RunFileResult {
  const tree = parseSource(language, source);
  const diagnostics: Diagnostic[] = [];
  const run = { filePath, source, language, diagnostics };
  for (const rule of rules) {
    try {
      runRule(rule, run, tree);
    } catch (err) {
      diagnostics.push(ruleFailedDiagnostic(filePath, rule.id, err));
    }
  }
  return { filePath, language, diagnostics };
}

function ruleFailedDiagnostic(filePath: string, ruleId: string, err: unknown): Diagnostic {
  const message = err instanceof Error ? err.message : String(err);
  return {
    ruleId: '@aicq/parse-failed',
    severity: 'warning',
    message: `parser failed in rule ${ruleId}: ${message}`,
    messageKo: `파서 실패 (룰 ${ruleId}): ${message}`,
    file: filePath,
    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
  };
}
