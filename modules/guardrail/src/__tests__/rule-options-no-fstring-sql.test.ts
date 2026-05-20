import { describe, expect, it } from 'vitest';
import { applyRuleConfig } from '../runner/apply-rule-config.js';
import { runFileWithSource } from '../runner/run-file.js';
import noFstringSql from '../rules-default/no-fstring-sql.js';

const SELECT_SRC = 'query = f"SELECT * FROM users WHERE id = {uid}"\n';
const CREATE_TABLE_SRC = 'query = f"CREATE TABLE {name} (id INTEGER PRIMARY KEY)"\n';

/**
 * Alpha.16 — `no-fstring-sql.sqlKeywords` migration. Covers:
 *   1. defaults reproduce alpha.15 (SELECT in f-string + interpolation flagged)
 *   2. extending sqlKeywords with multi-token 'CREATE TABLE' catches DDL f-strings
 *   3. empty array = mute (SELECT in f-string + interpolation no longer flagged)
 */
describe('no-fstring-sql — alpha.16 sqlKeywords option', () => {
  it('1. defaults reproduce alpha.15 — SELECT inside f-string + interpolation flagged', () => {
    const result = runFileWithSource('src/db.py', SELECT_SRC, 'python', [noFstringSql]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-fstring-sql');
  });

  it('2. extending sqlKeywords with multi-token "CREATE TABLE" catches DDL', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noFstringSql], {
      'no-fstring-sql': { options: { sqlKeywords: ['SELECT', 'CREATE TABLE'] } },
    });
    const result = runFileWithSource('src/db.py', CREATE_TABLE_SRC, 'python', effective, {
      ruleOptions,
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('no-fstring-sql');
  });

  it('3. sqlKeywords: [] mutes the rule (SELECT f-string no longer flagged)', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([noFstringSql], {
      'no-fstring-sql': { options: { sqlKeywords: [] } },
    });
    const result = runFileWithSource('src/db.py', SELECT_SRC, 'python', effective, {
      ruleOptions,
    });
    expect(result.diagnostics).toHaveLength(0);
  });
});
