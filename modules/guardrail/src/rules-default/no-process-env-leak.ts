import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Forbids direct `process.env.X` access outside of designated config modules.
 * Centralize env reading in `config/`, `env/`, or `*.config.ts` for type-safety + validation.
 */
export default defineRule({
  id: 'no-process-env-leak',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Read `process.env` only via the config module (config/env.ts).',
  messageKo: '`process.env` 직접 접근 금지 — config 모듈(config/env.ts)을 통해서만 읽으세요.',
  visitors: {
    member_expression(node, ctx) {
      const obj = node.childForFieldName('object');
      const prop = node.childForFieldName('property');
      if (!obj || !prop) return;
      if (obj.type === 'member_expression') {
        const inner = obj.childForFieldName('object');
        const innerProp = obj.childForFieldName('property');
        if (
          inner &&
          innerProp &&
          ctx.textOf(inner) === 'process' &&
          ctx.textOf(innerProp) === 'env'
        ) {
          // Allowlist: `config/`, `env/`, and `*.config.*` / `*.env.*` files (e.g. `next.config.ts`,
          // `vite.config.ts`, `jest.config.ts`). Includes a leading `.` in the prefix character
          // class so dotted filenames where `config`/`env` is preceded by `.` (e.g. `next.config.ts`)
          // are recognized.
          if (/(^|[/\\.])(config|env)([/\\.]|$)/.test(ctx.filePath)) return;
          ctx.report({ node });
        }
      }
    },
  },
});
