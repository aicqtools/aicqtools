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
