import { readFile } from 'node:fs/promises';
import type { Diagnostic, Language } from '@aicqtools/core';
import { detectLanguage, parseSource } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { runRule } from './run-rule.js';
import { applySuppressions, parseSuppressions } from './suppressions.js';

export interface RunFileResult {
  readonly filePath: string;
  readonly language: Language | null;
  readonly diagnostics: readonly Diagnostic[];
}

export interface RunFileOptions {
  readonly skipBuiltinSkips?: boolean;
  /**
   * Alpha.14 — per-rule resolved options for this file. Keyed by ruleId. The runner pulls the
   * matching entry per rule and threads it into `RuleContext.options` via `makeRuleContext`.
   */
  readonly ruleOptions?: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
}

export async function runFile(
  filePath: string,
  rules: readonly Rule[],
  opts?: RunFileOptions,
): Promise<RunFileResult> {
  const language = detectLanguage(filePath);
  if (!language) return { filePath, language: null, diagnostics: [] };

  const source = await readFile(filePath, 'utf-8');
  return runFileWithSource(filePath, source, language, rules, opts);
}

export function runFileWithSource(
  filePath: string,
  source: string,
  language: Language,
  rules: readonly Rule[],
  opts?: RunFileOptions,
): RunFileResult {
  const tree = parseSource(language, source);
  const diagnostics: Diagnostic[] = [];
  const ruleOptions = opts?.ruleOptions;
  const skipBuiltinSkips = opts?.skipBuiltinSkips ?? false;
  for (const rule of rules) {
    const resolvedOptions = ruleOptions?.get(rule.id);
    const run = {
      filePath,
      source,
      language,
      diagnostics,
      skipBuiltinSkips,
      ...(resolvedOptions !== undefined ? { options: resolvedOptions } : {}),
    };
    try {
      runRule(rule, run, tree);
    } catch (err) {
      diagnostics.push(ruleFailedDiagnostic(filePath, rule.id, err));
    }
  }
  // Apply inline-suppression directives last so they catch diagnostics from every rule
  // (function rules, YAML pattern rules, and synthetic `@aicq/parse-failed`/rule-failed).
  let suppressed: readonly Diagnostic[] = diagnostics;
  try {
    const suppressions = parseSuppressions(tree, source, language);
    suppressed = applySuppressions(diagnostics, suppressions);
  } catch {
    // Suppression parsing must never abort a run. If the tree shape surprises us,
    // fall through with the unfiltered diagnostics.
  }
  return { filePath, language, diagnostics: suppressed };
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
