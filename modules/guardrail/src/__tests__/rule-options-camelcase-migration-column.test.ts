import { describe, expect, it } from 'vitest';
import { applyRuleConfig } from '../runner/apply-rule-config.js';
import { runFileWithSource } from '../runner/run-file.js';
import camelcaseMigrationColumn from '../rules-default/camelcase-migration-column.js';

const SEQUELIZE_SRC =
  "queryInterface.createTable('users', { user_id: { type: 'INTEGER' } });\n";
const KNEX_SRC =
  "queryInterface.create_table('users', { user_id: { type: 'INTEGER' } });\n";

/**
 * Alpha.16 — `camelcase-migration-column.migrationFunctions` migration. Covers:
 *   1. defaults reproduce alpha.15 behavior (`createTable` detection)
 *   2. user-supplied Knex-style function names work; default `createTable` no longer matches
 *   3. empty array = mute (no function matched)
 */
describe('camelcase-migration-column — alpha.16 migrationFunctions option', () => {
  it('1. defaults reproduce alpha.15 — createTable + snake_case key triggers violation', () => {
    const result = runFileWithSource('src/migration.ts', SEQUELIZE_SRC, 'typescript', [
      camelcaseMigrationColumn,
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('camelcase-migration-column');
  });

  it('2. Knex-style migrationFunctions: create_table catches snake_case ORM functions', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([camelcaseMigrationColumn], {
      'camelcase-migration-column': {
        options: { migrationFunctions: ['create_table', 'add_column'] },
      },
    });
    // Knex-style call → matches user-supplied list
    const knexResult = runFileWithSource('src/migration.ts', KNEX_SRC, 'typescript', effective, {
      ruleOptions,
    });
    expect(knexResult.diagnostics).toHaveLength(1);

    // Default Sequelize call → no longer matches (list was replaced, not merged)
    const sequelizeResult = runFileWithSource(
      'src/migration.ts',
      SEQUELIZE_SRC,
      'typescript',
      effective,
      { ruleOptions },
    );
    expect(sequelizeResult.diagnostics).toHaveLength(0);
  });

  it('3. migrationFunctions: [] mutes the rule entirely (no function name matches)', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([camelcaseMigrationColumn], {
      'camelcase-migration-column': { options: { migrationFunctions: [] } },
    });
    const result = runFileWithSource('src/migration.ts', SEQUELIZE_SRC, 'typescript', effective, {
      ruleOptions,
    });
    expect(result.diagnostics).toHaveLength(0);
  });
});
