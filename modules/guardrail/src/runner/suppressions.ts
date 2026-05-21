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

/**
 * Alpha.17 — a single parsed `aicq-disable-*` directive. Preserved on `Suppressions` so the
 * runner can detect directives that matched zero diagnostics (`@aicq/unused-suppression`).
 *
 * `targetLine` is the line the directive applies to:
 *  - `line` scope → the comment's own line(s)
 *  - `next-line` → the line after the comment ends
 *  - `file` scope → encoded as the special `'file'` sentinel via `targetScope`
 * `commentLine` / `commentColumn` always points at the directive comment itself (1-based) so
 * the synthetic diagnostic can be located in the user's editor.
 */
export interface SuppressionDirective {
  readonly scope: 'line' | 'next-line' | 'file';
  /** 1-based line of the directive comment itself (anchoring point for the synthetic diagnostic). */
  readonly commentLine: number;
  /** 1-based column of the directive comment. Falls back to 1 when unknown. */
  readonly commentColumn: number;
  /** Rule ids the directive suppresses. `'*'` = bare directive (all rules). */
  readonly ruleIds: ReadonlySet<string> | '*';
}

export interface Suppressions {
  /** Per-line maps: line number → set of rule ids ('*' = all). */
  readonly byLine: Map<number, Set<string> | '*'>;
  /** File-wide suppressions. */
  readonly fileLevel: Set<string> | '*' | null;
  /**
   * Alpha.17 — flat list of every directive `parseSuppressions` saw, in source order. The byLine
   * / fileLevel maps stay the fast path for filtering; `directives` is consumed only by the
   * unused-suppression reporter. Reading order matches source order so diagnostic ranges are
   * stable in the user's editor.
   */
  readonly directives: readonly SuppressionDirective[];
}

/**
 * Result of `applySuppressions` (alpha.17 shape). Kept as a struct so the runner can decide
 * whether to emit `@aicq/unused-suppression` diagnostics without an extra pass over the data.
 *
 * - `filtered` — the diagnostics that survived suppression (this is what the caller pushes onto
 *   the report).
 * - `unused`  — the subset of `suppressions.directives` whose `ruleIds` matched zero diagnostics
 *   in this file. Empty list when every directive was used at least once.
 */
export interface ApplySuppressionsResult {
  readonly filtered: Diagnostic[];
  readonly unused: readonly SuppressionDirective[];
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
  const directives: SuppressionDirective[] = [];

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
    const commentLine = node.startPosition.row + 1;
    const commentColumn = node.startPosition.column + 1;
    directives.push({
      scope: verb,
      commentLine,
      commentColumn,
      ruleIds: ids,
    });
    if (verb === 'file') {
      mergeFile(ids);
      return;
    }
    // Lines are 1-based to match Diagnostic.range.start.line
    const startLine = commentLine;
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

  return { byLine, fileLevel, directives };
}

/**
 * Filter diagnostics through the parsed suppressions. Diagnostics whose `ruleId` is suppressed
 * either file-wide or on its specific line are removed. `@aicq/parse-failed` (and any other
 * synthetic diagnostic emitted by the runner) is treated like any other rule and can be
 * suppressed by id or with a bare directive.
 *
 * Alpha.17: returns `{ filtered, unused }` so the runner can emit `@aicq/unused-suppression`
 * info diagnostics for directives that matched zero violations. A directive is "used" when at
 * least one diagnostic in the file matches its scope (file / line) AND its rule-id list (or it
 * was a bare `'*'` directive on a line/file that had any diagnostic at all).
 */
export function applySuppressions(
  diagnostics: readonly Diagnostic[],
  suppressions: Suppressions,
): ApplySuppressionsResult {
  const usedKeys = new Set<string>();
  const noSuppressions =
    suppressions.fileLevel === null &&
    suppressions.byLine.size === 0 &&
    suppressions.directives.length === 0;
  if (noSuppressions) return { filtered: [...diagnostics], unused: [] };

  const filtered: Diagnostic[] = [];
  const fileSet = suppressions.fileLevel instanceof Set ? suppressions.fileLevel : null;
  const fileIsWildcard = suppressions.fileLevel === '*';

  for (const d of diagnostics) {
    let suppressed = false;
    if (fileIsWildcard) {
      usedKeys.add('file:*');
      suppressed = true;
    } else if (fileSet && fileSet.has(d.ruleId)) {
      usedKeys.add('file:' + d.ruleId);
      suppressed = true;
    }
    if (!suppressed) {
      const lineMap = suppressions.byLine.get(d.range.start.line);
      if (lineMap === '*') {
        usedKeys.add('line:' + d.range.start.line + ':*');
        suppressed = true;
      } else if (lineMap && lineMap.has(d.ruleId)) {
        usedKeys.add('line:' + d.range.start.line + ':' + d.ruleId);
        suppressed = true;
      }
    }
    if (!suppressed) filtered.push(d);
  }

  // For each parsed directive, decide whether at least one usedKey matches its scope+ruleIds.
  // The directive's target line for `next-line` / `line` scope is derived the same way as in
  // `parseSuppressions` so the matching is consistent.
  const unused: SuppressionDirective[] = [];
  for (const dir of suppressions.directives) {
    if (directiveWasUsed(dir, usedKeys)) continue;
    unused.push(dir);
  }
  return { filtered, unused };
}

/**
 * Internal — check whether a directive's scope+ruleIds intersect with any `usedKeys` recorded
 * during the filter pass. A wildcard (`'*'`) directive is "used" if anything was suppressed at
 * its scope; a named-rule directive is "used" if at least one of its ids was suppressed.
 */
function directiveWasUsed(
  dir: SuppressionDirective,
  usedKeys: ReadonlySet<string>,
): boolean {
  if (dir.scope === 'file') {
    if (dir.ruleIds === '*') return usedKeys.has('file:*');
    for (const id of dir.ruleIds) {
      if (usedKeys.has('file:' + id)) return true;
    }
    return false;
  }
  // For line / next-line: the byLine map merges multiple directives at the same target line,
  // so a single `usedKeys` entry can satisfy any directive targeting that line. We approximate
  // by checking every line for which the directive could fire — for `line` scope the comment's
  // own line; for `next-line` the line after. The bare directive case ('*') matches when ANY
  // diagnostic on that line was suppressed via the wildcard or via any rule id (this would only
  // happen if multiple directives merged, which we already accounted for above).
  const candidateLines = candidateLinesForDirective(dir);
  for (const line of candidateLines) {
    if (dir.ruleIds === '*') {
      if (usedKeys.has('line:' + line + ':*')) return true;
      // Wildcard merged with a named directive on the same line — accept any line-keyed hit.
      for (const key of usedKeys) {
        if (key.startsWith('line:' + line + ':')) return true;
      }
      continue;
    }
    for (const id of dir.ruleIds) {
      if (usedKeys.has('line:' + line + ':' + id)) return true;
    }
  }
  return false;
}

function candidateLinesForDirective(dir: SuppressionDirective): readonly number[] {
  if (dir.scope === 'file') return [];
  if (dir.scope === 'next-line') return [dir.commentLine + 1];
  return [dir.commentLine];
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
