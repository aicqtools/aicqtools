import { defineRule } from '@aicqtools/rule-sdk';

const SQL_KEYWORD_PATTERN = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|VALUES)\b/i;

export default defineRule({
  id: 'no-fstring-sql',
  language: 'python',
  severity: 'error',
  message: 'SQL inside f-string is a SQL injection vector — use parameterized queries.',
  messageKo: 'f-string으로 SQL 조합은 SQL 주입 위험 — 파라미터 바인딩을 사용하세요.',
  visitors: {
    string(node, ctx) {
      const text = ctx.textOf(node);
      // Python f-string starts with f" or f' (or rf", fr", etc.)
      if (!/^[a-zA-Z]*[fF][a-zA-Z]*['"]/.test(text)) return;
      if (!SQL_KEYWORD_PATTERN.test(text)) return;
      // Has interpolation `{...}`?
      if (!/\{[^{}]+\}/.test(text)) return;
      ctx.report({ node });
    },
  },
});
