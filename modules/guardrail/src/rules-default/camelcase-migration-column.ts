import type Parser from 'tree-sitter';
import { z } from 'zod';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Default Sequelize migration functions whose first object-shaped argument we scan for
 * snake_case column keys. Alpha.16 promotes this to `options.migrationFunctions` so users
 * on Knex / TypeORM / custom ORMs can swap in their own function names (e.g. Knex
 * `['create_table', 'add_column']`). Default keeps alpha.15 behavior bit-for-bit identical.
 */
const DEFAULT_MIGRATION_FUNCTIONS: readonly string[] = [
  'createTable',
  'addColumn',
  'changeColumn',
] as const;

const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

const optionsSchema = z
  .object({
    migrationFunctions: z.array(z.string()).default([...DEFAULT_MIGRATION_FUNCTIONS]),
  })
  .strict();

interface CamelcaseMigrationColumnOptions {
  readonly migrationFunctions: readonly string[];
}

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
  options: {
    schema: optionsSchema,
    defaults: { migrationFunctions: [...DEFAULT_MIGRATION_FUNCTIONS] },
  },
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn || fn.type !== 'member_expression') return;
      const prop = fn.childForFieldName('property');
      const obj = fn.childForFieldName('object');
      if (!prop || !obj) return;
      // Only inside `queryInterface.createTable(...)` etc.
      if (ctx.textOf(obj) !== 'queryInterface') return;
      const opts = (ctx.options as CamelcaseMigrationColumnOptions | undefined) ?? {
        migrationFunctions: DEFAULT_MIGRATION_FUNCTIONS,
      };
      const fnSet = new Set(opts.migrationFunctions);
      if (!fnSet.has(ctx.textOf(prop))) return;
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
