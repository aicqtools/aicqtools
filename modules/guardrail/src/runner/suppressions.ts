import type Parser from 'tree-sitter';
import type { Diagnostic, Language } from '@aicqtools/core';
import { traverse } from '../matcher/traverse.js';

/**
 * Inline suppression directives — ESLint-style comment markers that suppress diagnostics
 * for a specific line, the next line, or the entire file. Supported syntaxes:
 *
 *   // aicq-disable-next-line <rule-id>[, <rule-id>...]
 *   // aicq-disable-line       <rule-id>[, ...]
 *   // aicq-disable-file       <rule-id>[, ...]
 *
 * Python uses `#` instead of `//`. Block comments (`/* ...\*\/`) are also recognized.
 * The trailing rule-id list may be omitted — a bare directive suppresses *all* rules for that
 * scope. Multiple ids may be separated by commas, whitespace, or both. Unknown ids are silently
 * accepted (a project may rename rules; we don't want a stale directive to crash the run).
 */

export type Scope = number | 'file';

export interface Suppressions {
  /** Per-line maps: line number → set of rule ids ('*' = all). */
  readonly byLine: Map<number, Set<string> | '*'>;
  /** File-wide suppressions. */
  readonly fileLevel: Set<string> | '*' | null;
}

const COMMENT_NODE_TYPES = new Set(['comment', 'block_comment', 'line_comment']);
// Capture group 1: directive verb. Group 2: optional rule-id list.
const DIRECTIVE_RE = /aicq-disable-(next-line|line|file)\b\s*(.*)/i;

/**
 * Walk the tree's comment nodes and produce a Suppressions map. Never throws — if the grammar
 * yields no comment nodes for a given language, the result is empty (and applySuppressions is
 * a no-op). The `language` parameter is reserved for future per-language tweaks; today it's
 * only used to recognize that block comments may span multiple lines.
 */
export function parseSuppressions(
  tree: Parser.Tree,
  source: string,
  language: Language,
): Suppressions {
  void language; // currently uniform across supported languages
  const byLine = new Map<number, Set<string> | '*'>();
  let fileLevel: Set<string> | '*' | null = null;

  const mergeAtLine = (line: number, ids: Set<string> | '*'): void => {
    const existing = byLine.get(line);
    if (existing === undefined) {
      byLine.set(line, ids === '*' ? '*' : new Set(ids));
      return;
    }
    if (existing === '*' || ids === '*') {
      byLine.set(line, '*');
      return;
    }
    for (const id of ids) existing.add(id);
  };

  const mergeFile = (ids: Set<string> | '*'): void => {
    if (fileLevel === '*' || ids === '*') {
      fileLevel = '*';
      return;
    }
    if (fileLevel === null) {
      fileLevel = new Set(ids);
      return;
    }
    for (const id of ids) fileLevel.add(id);
  };

  traverse(tree.rootNode, (node) => {
    if (!COMMENT_NODE_TYPES.has(node.type)) return;
    const raw = source.slice(node.startIndex, node.endIndex);
    // Strip comment delimiters before regex match so the body is what we scan.
    const body = stripCommentDelimiters(raw);
    const m = DIRECTIVE_RE.exec(body);
    if (!m) return;
    const verb = m[1]?.toLowerCase() as 'next-line' | 'line' | 'file' | undefined;
    if (!verb) return;
    const ids = parseRuleIds(m[2] ?? '');
    if (verb === 'file') {
      mergeFile(ids);
      return;
    }
    // Lines are 1-based to match Diagnostic.range.start.line
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    if (verb === 'next-line') {
      mergeAtLine(endLine + 1, ids);
    } else {
      // 'line' — for a leading standalone comment, apply to the comment's own line(s).
      // For a trailing comment (e.g. `code; // aicq-disable-line`), the comment is on the
      // same line as the code, so this also applies correctly.
      for (let l = startLine; l <= endLine; l++) mergeAtLine(l, ids);
    }
  });

  return { byLine, fileLevel };
}

/**
 * Filter diagnostics through the parsed suppressions. Diagnostics whose `ruleId` is suppressed
 * either file-wide or on its specific line are removed. `@aicq/parse-failed` (and any other
 * synthetic diagnostic emitted by the runner) is treated like any other rule and can be
 * suppressed by id or with a bare directive.
 */
export function applySuppressions(
  diagnostics: readonly Diagnostic[],
  suppressions: Suppressions,
): Diagnostic[] {
  if (suppressions.fileLevel === '*') return [];
  const fileSet = suppressions.fileLevel instanceof Set ? suppressions.fileLevel : null;
  const hasAnyLine = suppressions.byLine.size > 0;
  if (!fileSet && !hasAnyLine) return [...diagnostics];

  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    if (fileSet && fileSet.has(d.ruleId)) continue;
    const lineMap = suppressions.byLine.get(d.range.start.line);
    if (lineMap === '*') continue;
    if (lineMap && lineMap.has(d.ruleId)) continue;
    out.push(d);
  }
  return out;
}

function stripCommentDelimiters(raw: string): string {
  // `//foo` → `foo`, `# foo` → `foo`, `/* foo */` → `foo`, `<!-- foo -->` (just in case) → `foo`
  return raw
    .replace(/^\s*\/\*/, '')
    .replace(/\*\/\s*$/, '')
    .replace(/^\s*\/\//, '')
    .replace(/^\s*#/, '')
    .replace(/^\s*<!--/, '')
    .replace(/-->\s*$/, '')
    .trim();
}

/**
 * Split the directive tail into a set of rule ids. Empty tail → '*' (bare directive).
 * Accepts commas, whitespace, or both as separators; ignores empty tokens; lowercases nothing
 * (rule ids are case-sensitive). Returns `'*'` when the tail is empty.
 */
function parseRuleIds(tail: string): Set<string> | '*' {
  const trimmed = tail.trim();
  if (trimmed.length === 0) return '*';
  const tokens = trimmed
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (tokens.length === 0) return '*';
  return new Set(tokens);
}
