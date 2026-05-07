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
