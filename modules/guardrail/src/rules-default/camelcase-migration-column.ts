import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

const SEQUELIZE_MIGRATION_FNS = new Set(['createTable', 'addColumn', 'changeColumn']);
const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

function findColumnDefObject(callNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const args = callNode.childForFieldName('arguments');
  if (!args) return null;
  // Sequelize patterns: createTable('users', { columnDef }), addColumn('users', 'colName', {def}), etc.
  for (let i = 0; i < args.namedChildCount; i++) {
    const arg = args.namedChild(i);
    if (arg && arg.type === 'object') return arg;
  }
  return null;
}

export default defineRule({
  id: 'camelcase-migration-column',
  language: ['typescript', 'javascript'],
  severity: 'warning',
  message: 'Sequelize migration column should use camelCase to match model attribute (avoid `underscored: true` divergence).',
  messageKo: 'Sequelize 마이그레이션 컬럼명은 모델과 일치하도록 camelCase 사용 (snake_case는 underscored 옵션 충돌 위험).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/camelcase-migration-column.md',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn || fn.type !== 'member_expression') return;
      const prop = fn.childForFieldName('property');
      const obj = fn.childForFieldName('object');
      if (!prop || !obj) return;
      // Only inside `queryInterface.createTable(...)` etc.
      if (ctx.textOf(obj) !== 'queryInterface') return;
      if (!SEQUELIZE_MIGRATION_FNS.has(ctx.textOf(prop))) return;
      const colObj = findColumnDefObject(node);
      if (!colObj) return;
      // Check each top-level key for snake_case
      for (let i = 0; i < colObj.namedChildCount; i++) {
        const pair = colObj.namedChild(i);
        if (!pair || pair.type !== 'pair') continue;
        const key = pair.childForFieldName('key');
        if (!key) continue;
        const keyText = ctx.textOf(key).replace(/['"]/g, '');
        if (SNAKE_CASE_PATTERN.test(keyText)) {
          ctx.report({ node: key });
        }
      }
    },
  },
});
