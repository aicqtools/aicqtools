import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Skip build/utility script directories where `console.log` is the intended I/O channel
 * (`scripts/`, `tools/`, `bin/` — same convention as alpha.8's `seeders/`+`migrations/`
 * skip for `no-magic-number`). The rule continues to fire in application source.
 */
export const SKIP_FILE_RE = /[/\\](scripts|tools|bin)[/\\]/;

export default defineRule({
  id: 'no-console-log',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Avoid console.log in production code.',
  messageKo: '운영 코드에서 console.log 사용을 피하세요.',
  skipPatterns: [SKIP_FILE_RE],
  visitors: {
    call_expression(node, ctx) {
      if (SKIP_FILE_RE.test(ctx.filePath)) return;
      const fn = node.childForFieldName('function');
      if (!fn) return;
      const text = ctx.textOf(fn);
      if (text === 'console.log') ctx.report({ node });
    },
  },
});
