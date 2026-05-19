import type { Language, Severity, Range } from '@aicqtools/core';
import type Parser from 'tree-sitter';

export type NodeType = string;

export interface RuleMeta {
  readonly id: string;
  readonly language: Language | readonly Language[];
  readonly severity: Severity;
  readonly message: string;
  readonly messageKo?: string;
  readonly docs?: string;
  /**
   * Optional list of file-path globs (micromatch-compatible). If `ctx.filePath` matches any of
   * these, the rule is skipped for that file. Use it on rules that have a single designated
   * "allowed" call-site (e.g. an LLM wrapper file legitimately calling `new OpenAI()`) — keep
   * the globs generic conventions, not project-specific paths.
   */
  readonly pathExclude?: readonly string[];
  /**
   * Optional list of RegExps that mirror a rule body's internal `SKIP_FILE_RE` guard. If
   * `ctx.filePath` matches any of these, the rule is expected to skip that file.
   *
   * This is **metadata for tooling** (e.g. `aicq rules suggest` surfaces it to users so they
   * can see which paths the rule auto-skips). The rule body MUST still perform the actual
   * skip — this field does NOT replace the runtime guard. A unit test enforces meta = code
   * equality for the built-in rules that use it.
   *
   * Semantically distinct from `pathExclude`:
   * - `pathExclude` (above) = micromatch globs, applied by the **runner** before the rule
   *   visitor is invoked.
   * - `skipPatterns` (here) = RegExps, applied **inside the rule body**. The runner does not
   *   read this field for filtering — it only reads it for surfacing to humans.
   */
  readonly skipPatterns?: readonly RegExp[];
}

export interface ReportArgs {
  readonly node: Parser.SyntaxNode;
  readonly message?: string;
  readonly messageKo?: string;
}

export interface RuleContext {
  readonly filePath: string;
  readonly source: string;
  readonly language: Language;
  readonly report: (args: ReportArgs) => void;
  readonly textOf: (node: Parser.SyntaxNode) => string;
  readonly rangeOf: (node: Parser.SyntaxNode) => Range;
  /**
   * Alpha.13 escape hatch. When `true`, built-in rules' internal `SKIP_FILE_RE` guards should
   * be bypassed so the rule fires even on conventionally-skipped paths. Default `false` keeps
   * alpha.10~12 behavior. Optional so external rule authors are unaffected (backward-compat).
   */
  readonly skipBuiltinSkips?: boolean;
}

export type Visitor = (node: Parser.SyntaxNode, ctx: RuleContext) => void;

export interface FunctionRule extends RuleMeta {
  readonly kind: 'function';
  readonly visitors: Readonly<Record<NodeType, Visitor>>;
}

export interface PatternRule extends RuleMeta {
  readonly kind: 'pattern';
  readonly query: string;
}

export type Rule = FunctionRule | PatternRule;

export type DefineRuleInput = Omit<FunctionRule, 'kind'>;
