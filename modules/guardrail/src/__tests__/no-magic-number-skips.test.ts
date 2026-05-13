import { describe, expect, it } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noMagicNumber from '../rules-default/no-magic-number.js';

const rules = [noMagicNumber];

function countMagic(src: string, lang: 'typescript' | 'tsx' | 'javascript' = 'typescript', filePath = 'app.ts'): number {
  const result = runFileWithSource(filePath, src, lang, rules);
  return result.diagnostics.length;
}

describe('no-magic-number — generic AST skips (alpha.7)', () => {
  it('skips numeric literals inside JSX attribute values', () => {
    expect(countMagic('const e = <View width={24} height={48} margin={7} />;\n', 'tsx', 'app.tsx')).toBe(0);
  });

  it('skips numeric literals inside enum members', () => {
    expect(countMagic('enum E { A = 7, B = 13, C = 99 }\n')).toBe(0);
  });

  it('skips numeric literals used as array subscripts', () => {
    expect(countMagic('const x = arr[42]; const y = arr[1337];\n')).toBe(0);
  });

  it('skips numeric literals inside `for` loop headers', () => {
    expect(countMagic('for (let i = 0; i < 5; i++) { /* body */ }\n')).toBe(0);
  });

  it('skips arguments to numeric APIs (parseInt radix, setTimeout delay, Math.max)', () => {
    expect(countMagic('parseInt(s, 16);\n')).toBe(0);
    expect(countMagic('setTimeout(f, 100);\n')).toBe(0);
    expect(countMagic('Math.max(3, 7);\n')).toBe(0);
    expect(countMagic('a.toFixed(2);\n')).toBe(0);
  });

  it('skips numeric literals on the RHS of a variable_declarator (the constant being NAMED)', () => {
    // `RETRY = 5` is the constant definition — but `doThing(5)` is an inline use.
    const src = 'const RETRY = 5;\nfunction run() { doThing(5); }\n';
    expect(countMagic(src)).toBe(1);
  });

  it('skips files matching the generic config/polyfill/fixtures globs', () => {
    const src = 'const port = 8080;\n'; // 8080 is not in ALLOWED_NUMBERS
    expect(countMagic(src, 'typescript', 'app.config.ts')).toBe(0);
    expect(countMagic(src, 'typescript', 'core-js.polyfill.ts')).toBe(0);
    expect(countMagic(src, 'typescript', 'src/polyfills/global.ts')).toBe(0);
  });

  it('still flags a genuine magic number in regular code', () => {
    // 8080 isn't in ALLOWED_NUMBERS, isn't a JSX attr, etc.
    expect(countMagic('function run() { return 8080; }\n')).toBeGreaterThan(0);
  });

  it('extended ALLOWED_NUMBERS covers common bases & time constants', () => {
    expect(countMagic('const a = 16; const b = 24; const c = 60; const d = 1024;\n')).toBe(0);
  });
});
