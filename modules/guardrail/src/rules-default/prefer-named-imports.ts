import { defineRule } from '@aicqtools/rule-sdk';

/**
 * `import * as X from 'module'` namespace imports prevent tree-shaking and
 * obscure dependency analysis. Prefer named imports unless the module
 * genuinely exports many disparate symbols (rare).
 */
export default defineRule({
  id: 'prefer-named-imports',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Avoid `import * as X` namespace imports; use named imports for tree-shaking.',
  messageKo: '`import * as X` 네임스페이스 import 지양 — tree-shaking을 위해 named import 권장.',
  visitors: {
    import_statement(node, ctx) {
      const text = ctx.textOf(node);
      if (/import\s+\*\s+as\s+\w+/.test(text)) {
        // Allow type-only namespace imports (less impact on bundle)
        if (/import\s+type\s+\*/.test(text)) return;
        ctx.report({ node });
      }
    },
  },
});
