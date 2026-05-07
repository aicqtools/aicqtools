import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFunctionRulesFromDir } from '../rules-default/index.js';

const ruleSource = `export default {
  kind: 'function',
  id: 'no-bar',
  language: 'typescript',
  severity: 'warning',
  message: 'Avoid bar()',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      if (ctx.textOf(fn) === 'bar') ctx.report({ node });
    },
  },
};
`;

describe('loadFunctionRulesFromDir', () => {
  it('loads .mjs user rules and returns parsed Rule objects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aicq-userrules-'));
    try {
      await writeFile(join(dir, 'no-bar.mjs'), ruleSource, 'utf-8');
      const rules = await loadFunctionRulesFromDir(dir);
      expect(rules).toHaveLength(1);
      const rule = rules[0];
      expect(rule?.id).toBe('no-bar');
      expect(rule?.kind).toBe('function');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('skips non-rule files (no default export)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aicq-userrules-'));
    try {
      await writeFile(join(dir, 'helper.mjs'), `export const x = 1;\n`, 'utf-8');
      const rules = await loadFunctionRulesFromDir(dir);
      expect(rules).toHaveLength(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
