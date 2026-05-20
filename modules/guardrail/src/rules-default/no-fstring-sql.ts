import { z } from 'zod';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Default SQL keywords flagged inside Python f-strings. Alpha.16 exposes this list as
 * `options.sqlKeywords` so projects can shrink it (e.g. `['SELECT']` only) or extend it
 * (e.g. add `'CREATE TABLE'`). Default keeps alpha.15 behavior bit-for-bit identical.
 *
 * Multi-token keywords like `'CREATE TABLE'` work via `\b(...)\b` with the literal space
 * preserved — note that double spaces or newlines between tokens won't match, and meta
 * characters are escaped via `escapeRegex` to keep user-supplied keywords safe.
 */
const DEFAULT_SQL_KEYWORDS: readonly string[] = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'FROM',
  'WHERE',
  'JOIN',
  'VALUES',
] as const;

const optionsSchema = z
  .object({
    sqlKeywords: z.array(z.string()).default([...DEFAULT_SQL_KEYWORDS]),
  })
  .strict();

interface NoFstringSqlOptions {
  readonly sqlKeywords: readonly string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Module-scope compile cache — keyed by source array reference equality (same trade-off as
// alpha.15 `no-empty-catch.compileSkipPatterns`).
let cachedSource: readonly string[] | null = null;
let cachedPattern: RegExp | null = null;

function compileSqlKeywordPattern(source: readonly string[]): RegExp {
  if (cachedSource === source && cachedPattern !== null) return cachedPattern;
  const pattern = new RegExp('\\b(' + source.map(escapeRegex).join('|') + ')\\b', 'i');
  cachedSource = source;
  cachedPattern = pattern;
  return pattern;
}

export default defineRule({
  id: 'no-fstring-sql',
  language: 'python',
  severity: 'error',
  message: 'SQL inside f-string is a SQL injection vector — use parameterized queries.',
  messageKo: 'f-string으로 SQL 조합은 SQL 주입 위험 — 파라미터 바인딩을 사용하세요.',
  options: {
    schema: optionsSchema,
    defaults: { sqlKeywords: [...DEFAULT_SQL_KEYWORDS] },
  },
  visitors: {
    string(node, ctx) {
      const text = ctx.textOf(node);
      // Python f-string starts with f" or f' (or rf", fr", etc.)
      if (!/^[a-zA-Z]*[fF][a-zA-Z]*['"]/.test(text)) return;
      const opts = (ctx.options as NoFstringSqlOptions | undefined) ?? {
        sqlKeywords: DEFAULT_SQL_KEYWORDS,
      };
      if (opts.sqlKeywords.length === 0) return;
      const pattern = compileSqlKeywordPattern(opts.sqlKeywords);
      if (!pattern.test(text)) return;
      // Has interpolation `{...}`?
      if (!/\{[^{}]+\}/.test(text)) return;
      ctx.report({ node });
    },
  },
});
