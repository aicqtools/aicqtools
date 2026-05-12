import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRulesSuggest } from '../commands/rules-suggest.js';

let cwd: string;
let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'aicq-suggest-test-'));
  await writeFile(join(cwd, 'aicq.config.yaml'), 'locale: en\n', 'utf-8');
  await writeFile(
    join(cwd, 'app.ts'),
    ['export function run(): void {', "  console.log('a'); console.log('b'); console.log('c');", '}', ''].join('\n'),
    'utf-8',
  );
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ name: 'x', private: true, dependencies: { openai: '^4.0.0' } }),
    'utf-8',
  );
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(async () => {
  stdoutSpy.mockRestore();
  await rm(cwd, { recursive: true, force: true });
});

describe('runRulesSuggest', () => {
  it('returns exit code 0 and prints a suggestion table to stdout', async () => {
    const code = await runRulesSuggest({ cwd, format: 'text', cache: false });
    expect(code).toBe(0);
    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('no-console-log');
    expect(out).toContain('files scanned');
  });

  it('supports json output', async () => {
    const code = await runRulesSuggest({ cwd, format: 'json', cache: false });
    expect(code).toBe(0);
    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    const parsed = JSON.parse(out) as {
      suggestions: { ruleId: string }[];
      detectedDependencies: { name: string }[];
    };
    expect(parsed.suggestions.some((s) => s.ruleId === 'no-console-log')).toBe(true);
    expect(parsed.detectedDependencies.some((d) => d.name === 'openai')).toBe(true);
  });

  it('writes to a file when output is given', async () => {
    const code = await runRulesSuggest({ cwd, format: 'yaml', output: 'suggested.yaml', cache: false });
    expect(code).toBe(0);
    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('suggested.yaml');
  });
});
