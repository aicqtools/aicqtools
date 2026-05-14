/**
 * S3.A — TS 글로벌 추가 12개 룰 단위 테스트.
 * 각 룰당 위반/통과 케이스 1~2개씩.
 */
import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import { parseYamlRule } from '../matcher/yaml-rule.js';
import noBareThrow from '../rules-default/no-bare-throw.js';
import noConsoleLog from '../rules-default/no-console-log.js';
import noEmptyCatch from '../rules-default/no-empty-catch.js';
import noProcessEnvLeak from '../rules-default/no-process-env-leak.js';
import routeNeedsAuth from '../rules-default/route-needs-auth.js';
import noMagicNumber from '../rules-default/no-magic-number.js';
import noDefaultExportFromLibs from '../rules-default/no-default-export-from-libs.js';
import preferConstArray from '../rules-default/prefer-const-array.js';
import noBooleanTrap from '../rules-default/no-boolean-trap.js';
import preferNamedImports from '../rules-default/prefer-named-imports.js';
import noJsonbCircular from '../rules-default/no-jsonb-circular.js';

const noDirectAnthropic = parseYamlRule(`
id: no-direct-anthropic
language: typescript
severity: error
message: Use llmClient.
query: |
  (new_expression
    constructor: (identifier) @ctor
    (#eq? @ctor "Anthropic"))
`);

const noInlineDate = parseYamlRule(`
id: no-inline-date
language: typescript
severity: warning
message: Use dateHelper.
query: |
  (new_expression
    constructor: (identifier) @ctor
    (#eq? @ctor "Date")) @call
`);

describe('no-direct-anthropic (YAML)', () => {
  it('flags new Anthropic()', () => {
    const r = runFileWithSource('a.ts', `const c = new Anthropic({ apiKey: "x" });\n`, 'typescript', [noDirectAnthropic]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for llmClient', () => {
    const r = runFileWithSource('a.ts', `import { llmClient } from './x';\n`, 'typescript', [noDirectAnthropic]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-inline-date (YAML)', () => {
  it('flags new Date()', () => {
    const r = runFileWithSource('a.ts', `const now = new Date();\n`, 'typescript', [noInlineDate]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for dateHelper.now()', () => {
    const r = runFileWithSource('a.ts', `const now = dateHelper.now();\n`, 'typescript', [noInlineDate]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-bare-throw', () => {
  it('flags throw of string literal', () => {
    const r = runFileWithSource('a.ts', `function f() { throw "msg"; }\n`, 'typescript', [noBareThrow]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for throw new Error()', () => {
    const r = runFileWithSource('a.ts', `function f() { throw new Error("msg"); }\n`, 'typescript', [noBareThrow]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-empty-catch', () => {
  it('flags empty catch block', () => {
    const r = runFileWithSource('a.ts', `try { f(); } catch (e) {}\n`, 'typescript', [noEmptyCatch]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when catch logs', () => {
    const r = runFileWithSource('a.ts', `try { f(); } catch (e) { console.error(e); }\n`, 'typescript', [noEmptyCatch]);
    expect(r.diagnostics).toHaveLength(0);
  });
  // alpha.10: skip Capacitor/PWA bridge files where swallowing exceptions on purpose is the norm.
  it('skips empty catch in Capacitor `native-bridge.js`', () => {
    const r = runFileWithSource('public/native-bridge.js', `try { f(); } catch (e) {}\n`, 'javascript', [noEmptyCatch]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('skips empty catch in PWA `service-worker.ts`', () => {
    const r = runFileWithSource('public/service-worker.ts', `try { f(); } catch (e) {}\n`, 'typescript', [noEmptyCatch]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-process-env-leak', () => {
  it('flags process.env access in non-config file', () => {
    const r = runFileWithSource('src/app.ts', `const k = process.env.KEY;\n`, 'typescript', [noProcessEnvLeak]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes inside config/ directory', () => {
    const r = runFileWithSource('config/env.ts', `const k = process.env.KEY;\n`, 'typescript', [noProcessEnvLeak]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('route-needs-auth', () => {
  it('flags route without auth middleware', () => {
    const src = `router.get("/users", handler);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsAuth]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when authenticate is present', () => {
    const src = `router.get("/users", authenticate, handler);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsAuth]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes for /login (public)', () => {
    const src = `router.post("/login", handler);\n`;
    const r = runFileWithSource('a.ts', src, 'typescript', [routeNeedsAuth]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-magic-number', () => {
  it('flags raw number in expression', () => {
    const r = runFileWithSource('a.ts', `function f() { return x * 7.5; }\n`, 'typescript', [noMagicNumber]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for allowed numbers (0/1)', () => {
    const r = runFileWithSource('a.ts', `function f() { return x + 1; }\n`, 'typescript', [noMagicNumber]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('skips test files', () => {
    const r = runFileWithSource('foo.test.ts', `expect(x).toBe(42);\n`, 'typescript', [noMagicNumber]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-default-export-from-libs', () => {
  it('flags default export inside libs/', () => {
    const r = runFileWithSource('libs/foo/index.ts', `export default function bar() {}\n`, 'typescript', [noDefaultExportFromLibs]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes outside libs/', () => {
    const r = runFileWithSource('src/app.ts', `export default function bar() {}\n`, 'typescript', [noDefaultExportFromLibs]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('prefer-const-array', () => {
  it('flags let xs = []', () => {
    const r = runFileWithSource('a.ts', `function f() { let xs = []; xs.push(1); }\n`, 'typescript', [preferConstArray]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for const xs', () => {
    const r = runFileWithSource('a.ts', `function f() { const xs = []; }\n`, 'typescript', [preferConstArray]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-boolean-trap', () => {
  it('flags fn with single boolean parameter', () => {
    const r = runFileWithSource('a.ts', `function setActive(value: boolean) {}\n`, 'typescript', [noBooleanTrap]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for options object parameter', () => {
    const r = runFileWithSource('a.ts', `function setActive(opts: { silent: boolean }) {}\n`, 'typescript', [noBooleanTrap]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('prefer-named-imports', () => {
  it('flags import * as X', () => {
    const r = runFileWithSource('a.ts', `import * as path from 'path';\n`, 'typescript', [preferNamedImports]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for named imports', () => {
    const r = runFileWithSource('a.ts', `import { join } from 'path';\n`, 'typescript', [preferNamedImports]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-jsonb-circular', () => {
  it('flags JSON.stringify(req)', () => {
    const r = runFileWithSource('a.ts', `function f() { JSON.stringify(req); }\n`, 'typescript', [noJsonbCircular]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for plain object literal', () => {
    const r = runFileWithSource('a.ts', `function f() { JSON.stringify({ a: 1 }); }\n`, 'typescript', [noJsonbCircular]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-console-log — scripts/tools/bin path skip (alpha.10)', () => {
  it('flags console.log in application source', () => {
    const r = runFileWithSource('src/app.ts', `console.log("hi");\n`, 'typescript', [noConsoleLog]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('skips console.log under scripts/', () => {
    const r = runFileWithSource('backend/scripts/build.ts', `console.log("building");\n`, 'typescript', [noConsoleLog]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('skips console.log under tools/', () => {
    const r = runFileWithSource('apps/tools/gen.ts', `console.log("gen");\n`, 'typescript', [noConsoleLog]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('skips console.log under bin/', () => {
    const r = runFileWithSource('packages/cli/bin/launcher.ts', `console.log("cli");\n`, 'typescript', [noConsoleLog]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('matches Windows-style backslash paths', () => {
    const r = runFileWithSource('backend\\scripts\\build.ts', `console.log("building");\n`, 'typescript', [noConsoleLog]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
