import { readFile } from 'node:fs/promises';
import type { Diagnostic, Language } from '@aicqtools/core';
import { detectLanguage, parseSource } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { runRule } from './run-rule.js';
import {
  applySuppressions,
  parseSuppressions,
  type SuppressionDirective,
} from './suppressions.js';

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
  /**
   * Alpha.17 opt-in — when `true`, the runner emits one `@aicq/unused-suppression` info
   * diagnostic per `aicq-disable-*` directive that matched zero violations in this file.
   * Default `false` keeps the pre-alpha.17 output exactly (TalkUp dogfood regression guard).
   */
  readonly reportUnusedSuppressions?: boolean;
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
  let suppressed: Diagnostic[] = [...diagnostics];
  try {
    const suppressions = parseSuppressions(tree, source, language);
    const result = applySuppressions(diagnostics, suppressions);
    suppressed = result.filtered;
    // Alpha.17 — opt-in `@aicq/unused-suppression` info diagnostics. The synthetic id lives
    // outside the rules map (no `Rule` object), so user disable goes through the runner flag
    // (`reportUnusedSuppressions: false`) rather than `rules: { '@aicq/unused-suppression': off }`.
    if (opts?.reportUnusedSuppressions) {
      for (const dir of result.unused) {
        suppressed.push(unusedSuppressionDiagnostic(filePath, dir));
      }
    }
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

/**
 * Alpha.17 — synthetic info diagnostic emitted when an `aicq-disable-*` directive matched zero
 * violations during the run. Mirrors the `@aicq/parse-failed` shape with messages hardcoded in
 * both locales (en + ko) — the i18n table treats user-facing diagnostic text as static.
 *
 * `range` points at the directive comment itself (1-based line + column from `parseSuppressions`)
 * so editors / SARIF viewers land the user directly on the suppression that needs cleanup.
 */
function unusedSuppressionDiagnostic(
  filePath: string,
  dir: SuppressionDirective,
): Diagnostic {
  const ruleList =
    dir.ruleIds === '*' ? 'all rules' : Array.from(dir.ruleIds).sort().join(', ');
  const ruleListKo = dir.ruleIds === '*' ? '모든 룰' : ruleList;
  return {
    ruleId: '@aicq/unused-suppression',
    severity: 'info',
    message: `aicq-disable-${dir.scope} (${ruleList}) matched zero violations — remove the directive or fix the rule id.`,
    messageKo: `aicq-disable-${dir.scope} (${ruleListKo}) 디렉티브가 위반을 0건 적중 — 디렉티브 제거 또는 룰 이름 확인이 필요합니다.`,
    file: filePath,
    range: {
      start: { line: dir.commentLine, column: dir.commentColumn },
      end: { line: dir.commentLine, column: dir.commentColumn },
    },
  };
}
