import { readFile } from 'node:fs/promises';
import type { Diagnostic, Language } from '@aicq/core';
import { detectLanguage, parseSource } from '@aicq/core';
import type { Rule } from '@aicq/rule-sdk';
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
    runRule(rule, run, tree);
  }
  return { filePath, language, diagnostics };
}
