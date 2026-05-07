import type Parser from 'tree-sitter';
import type { Diagnostic, Language, Range, Severity } from '@aicq/core';
import type { RuleContext, RuleMeta, ReportArgs } from '@aicq/rule-sdk';

export function rangeOfNode(node: Parser.SyntaxNode): Range {
  return {
    start: { line: node.startPosition.row + 1, column: node.startPosition.column + 1 },
    end: { line: node.endPosition.row + 1, column: node.endPosition.column + 1 },
  };
}

export interface RunContext {
  readonly filePath: string;
  readonly source: string;
  readonly language: Language;
  readonly diagnostics: Diagnostic[];
}

export function makeRuleContext(run: RunContext, meta: RuleMeta): RuleContext {
  return {
    filePath: run.filePath,
    source: run.source,
    language: run.language,
    textOf(node) {
      return run.source.slice(node.startIndex, node.endIndex);
    },
    rangeOf(node) {
      return rangeOfNode(node);
    },
    report(args: ReportArgs) {
      const diagnostic: Diagnostic = {
        ruleId: meta.id,
        severity: meta.severity as Severity,
        message: args.message ?? meta.message,
        ...(args.messageKo ?? meta.messageKo
          ? { messageKo: args.messageKo ?? meta.messageKo }
          : {}),
        file: run.filePath,
        range: rangeOfNode(args.node),
        ...(meta.docs ? { docs: meta.docs } : {}),
      } as Diagnostic;
      run.diagnostics.push(diagnostic);
    },
  };
}
