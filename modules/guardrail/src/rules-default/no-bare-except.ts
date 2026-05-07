import { defineRule } from '@aicqtools/rule-sdk';

/**
 * `except:` (no exception type) catches everything including SystemExit and KeyboardInterrupt.
 * Always specify the exception class(es) to catch.
 */
export default defineRule({
  id: 'no-bare-except',
  language: 'python',
  severity: 'error',
  message: 'Bare `except:` catches SystemExit/KeyboardInterrupt — specify exception type(s).',
  messageKo: 'bare `except:`는 SystemExit/KeyboardInterrupt까지 잡습니다 — 예외 타입을 명시하세요.',
  visitors: {
    except_clause(node, ctx) {
      // tree-sitter-python's except_clause: `except [exception_type [as name]]: body`
      // Bare except has no type specifier between `except` and `:`.
      const text = ctx.textOf(node).split('\n')[0] ?? '';
      if (/^\s*except\s*:/.test(text)) {
        ctx.report({ node });
      }
    },
  },
});
