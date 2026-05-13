import Parser from 'tree-sitter';
import micromatch from 'micromatch';
import type { Language } from '@aicqtools/core';
import type { Rule, FunctionRule, PatternRule } from '@aicqtools/rule-sdk';
import { traverse } from '../matcher/traverse.js';
import { makeRuleContext, type RunContext } from './context.js';
import { loadLanguage } from '@aicqtools/core';

function ruleAppliesTo(rule: Rule, language: Language): boolean {
  const langs = Array.isArray(rule.language) ? rule.language : [rule.language];
  return langs.includes(language);
}

/**
 * Honor `rule.pathExclude` — a list of micromatch globs. Matching is performed against the
 * file path as supplied (absolute by default in normal runs, fixture-relative in unit tests),
 * and also against the path with backslashes normalized to forward slashes so authors can write
 * `**\/llm/client.*` without worrying about Windows separators. The match is "any glob" — one
 * match is enough to skip the rule for the file.
 */
function isPathExcluded(rule: Rule, filePath: string): boolean {
  if (!rule.pathExclude || rule.pathExclude.length === 0) return false;
  const globs = [...rule.pathExclude];
  const normalized = filePath.replace(/\\/g, '/');
  return micromatch.isMatch(normalized, globs, { dot: true }) || micromatch.isMatch(filePath, globs, { dot: true });
}

function runFunctionRule(rule: FunctionRule, run: RunContext, tree: Parser.Tree): void {
  const ctx = makeRuleContext(run, rule);
  traverse(tree.rootNode, (node) => {
    const visitor = rule.visitors[node.type];
    if (visitor) visitor(node, ctx);
  });
}

function runPatternRule(rule: PatternRule, run: RunContext, tree: Parser.Tree): void {
  const lang = loadLanguage(run.language);
  const query = new Parser.Query(lang, rule.query);
  const matches = query.matches(tree.rootNode);
  const ctx = makeRuleContext(run, rule);
  for (const match of matches) {
    const target = match.captures[0]?.node;
    if (target) ctx.report({ node: target });
  }
}

export function runRule(rule: Rule, run: RunContext, tree: Parser.Tree): void {
  if (!ruleAppliesTo(rule, run.language)) return;
  if (isPathExcluded(rule, run.filePath)) return;
  if (rule.kind === 'function') runFunctionRule(rule, run, tree);
  else runPatternRule(rule, run, tree);
}
