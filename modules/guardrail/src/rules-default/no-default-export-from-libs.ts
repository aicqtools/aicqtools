import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Inside a `libs/` or `packages/` directory, prefer named exports for tree-shaking
 * and clearer intent. `export default` makes refactoring/renaming harder across consumers.
 */
export default defineRule({
  id: 'no-default-export-from-libs',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Use named exports from libraries (default exports hinder tree-shaking and renames).',
  messageKo: '라이브러리는 named export를 사용하세요 (default export는 tree-shaking·이름 변경에 불리).',
  visitors: {
    export_statement(node, ctx) {
      // Only flag `export default ...` patterns inside lib/package directories
      if (!/(^|[/\\])(libs?|packages)[/\\]/.test(ctx.filePath)) return;
      const text = ctx.textOf(node);
      if (text.startsWith('export default ')) {
        ctx.report({ node });
      }
    },
  },
});
