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

describe('no-magic-number — seeders/migrations/fixtures path skip (alpha.8)', () => {
  // Numbers must live in *inline expression* positions to count as magic — putting them on the
  // RHS of a variable_declarator triggers the alpha.7 "you're naming the constant" skip and
  // would hide the path-level skip we're trying to verify. We use a function body with literals
  // in `if`, `return`, and arithmetic positions instead.
  const noisy =
    'export function score(x: number): number {\n  if (x > 4242) return 1500;\n  return x * 90;\n}\n';

  it('skips a Sequelize-style seeders directory', () => {
    expect(countMagic(noisy, 'typescript', 'backend/database/seeders/20240101-users.ts')).toBe(0);
  });

  it('skips a Knex-style migrations directory', () => {
    expect(countMagic(noisy, 'typescript', 'backend/database/migrations/001_init.ts')).toBe(0);
  });

  it('skips a fixtures directory (already in alpha.7, kept for regression)', () => {
    expect(countMagic(noisy, 'typescript', 'src/__tests__/fixtures/sample.ts')).toBe(0);
  });

  it('matches on Windows-style backslash paths too', () => {
    expect(countMagic(noisy, 'typescript', 'backend\\database\\seeders\\20240101-users.ts')).toBe(0);
    expect(countMagic(noisy, 'typescript', 'backend\\database\\migrations\\001_init.ts')).toBe(0);
  });

  it('still fires on adjacent application code in the same package', () => {
    expect(countMagic(noisy, 'typescript', 'backend/src/services/score.ts')).toBeGreaterThan(0);
  });
});

describe('no-magic-number — scripts/tools/bin + Capacitor/PWA bridge skip (alpha.10)', () => {
  const noisy =
    'export function score(x: number): number {\n  if (x > 4242) return 1500;\n  return x * 90;\n}\n';

  it('skips a build-script directory (scripts/)', () => {
    expect(countMagic(noisy, 'typescript', 'backend/scripts/migrate.ts')).toBe(0);
  });

  it('skips a tools directory', () => {
    expect(countMagic(noisy, 'typescript', 'apps/tools/gen-types.ts')).toBe(0);
  });

  it('skips a bin directory', () => {
    expect(countMagic(noisy, 'typescript', 'packages/cli/bin/launcher.ts')).toBe(0);
  });

  it('skips Capacitor `native-bridge.js`', () => {
    expect(countMagic(noisy, 'javascript', 'frontend/public/native-bridge.js')).toBe(0);
  });

  it('skips PWA `service-worker.ts`', () => {
    expect(countMagic(noisy, 'typescript', 'frontend/public/service-worker.ts')).toBe(0);
  });

  it('matches Windows-style backslash paths for scripts/tools/bin and bridge files', () => {
    expect(countMagic(noisy, 'typescript', 'backend\\scripts\\migrate.ts')).toBe(0);
    expect(countMagic(noisy, 'javascript', 'frontend\\public\\native-bridge.js')).toBe(0);
  });

  it('still fires on application code that contains `scripts` only as a path substring (e.g. `scripts-utils.ts` at top level)', () => {
    // `scripts-utils.ts` lacks the `/scripts/` segment, so the skip must not trigger.
    expect(countMagic(noisy, 'typescript', 'src/scripts-utils.ts')).toBeGreaterThan(0);
  });

  it('does NOT skip a bare `bridge.ts` (only `native-bridge` is the Capacitor convention)', () => {
    expect(countMagic(noisy, 'typescript', 'src/bridge.ts')).toBeGreaterThan(0);
  });
});

describe('no-magic-number — HTTP status code default allowlist (beta.1)', () => {
  // RFC 7231 / RFC 6585 status codes are universally well-known identifiers, not magic numbers.
  // beta.1 extends DEFAULT_ALLOWED_NUMBERS with 1xx/2xx/3xx/4xx/5xx common codes so Next.js /
  // Express / Hono / Fastify API routes stop firing on `res.status(200/404/500)`.
  it('allows res.status(200) without options', () => {
    expect(countMagic('export default (_req, res) => { res.status(200).json({}); };\n')).toBe(0);
  });

  it('allows res.status(404) without options', () => {
    expect(countMagic('export default (_req, res) => { res.status(404).json({}); };\n')).toBe(0);
  });

  it('allows res.status(500) without options', () => {
    expect(countMagic('export default (_req, res) => { res.status(500).json({}); };\n')).toBe(0);
  });

  it('covers 2xx success codes (200, 201, 204)', () => {
    expect(countMagic('function f() { return [200, 201, 204]; }\n')).toBe(0);
  });

  it('covers 3xx redirect codes (301, 302, 304)', () => {
    expect(countMagic('function f() { return [301, 302, 304]; }\n')).toBe(0);
  });

  it('covers 4xx client error codes (400, 401, 403, 404, 405, 409, 422, 429)', () => {
    expect(countMagic('function f() { return [400, 401, 403, 404, 405, 409, 422, 429]; }\n')).toBe(0);
  });

  it('covers 5xx server error codes (500, 502, 503, 504)', () => {
    expect(countMagic('function f() { return [500, 502, 503, 504]; }\n')).toBe(0);
  });

  it('still flags non-standard 3-digit numbers that are not in the default allowlist', () => {
    // 418 (teapot) is intentionally NOT in default allowlist — niche, not load-bearing.
    expect(countMagic('function f() { return 418; }\n')).toBeGreaterThan(0);
    // 8080 is a port, not a status code — must still fire.
    expect(countMagic('function f() { return 8080; }\n')).toBeGreaterThan(0);
  });

  it('user-supplied allowedNumbers fully overrides the default (no implicit merge)', () => {
    // With allowedNumbers: ['0', '1'] only, 200 must fire as a magic number again.
    // Verified separately in rule-options.test.ts; this is a sanity hook here.
    const result = runFileWithSource(
      'app.ts',
      'function f() { return 200; }\n',
      'typescript',
      [noMagicNumber],
      { ruleOptions: new Map([['no-magic-number', { allowedNumbers: ['0', '1'] }]]) },
    );
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
