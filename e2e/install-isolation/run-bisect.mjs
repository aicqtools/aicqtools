// alpha.5 regression fixture: install the packed CLI into a clean tempdir and
// assert (a) exactly one tree-sitter native copy is hoisted, (b) the four YAML
// pattern rules that crashed under alpha.4 produce zero @aicq/parse-failed.
//
// Usage: node e2e/install-isolation/run-bisect.mjs <tarball-dir>
//
// CI runs this after `pnpm -r pack --pack-destination <dir>`. The script is
// self-contained — no synthetic secrets, all string literals are obvious
// mock values per ~/.claude/rules/security.md §15.

import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const tarballDir = process.argv[2];
if (!tarballDir) {
  console.error('Usage: node run-bisect.mjs <tarball-dir>');
  process.exit(2);
}
const absTarballDir = resolve(tarballDir);
const tarballs = readdirSync(absTarballDir)
  .filter((f) => f.endsWith('.tgz'))
  .map((f) => join(absTarballDir, f));
if (tarballs.length === 0) {
  console.error(`No .tgz tarballs found in ${absTarballDir}`);
  process.exit(2);
}
console.log(`Found ${tarballs.length} tarball(s):`);
for (const t of tarballs) console.log(`  ${t}`);

// Map @aicqtools/<name> → tarball path, so user installs cli and npm resolves
// every workspace dep against the local tarballs.
const aicqMap = {};
for (const t of tarballs) {
  const base = t.split(/[\\/]/).pop();
  const m = base.match(/^aicqtools-([a-z0-9-]+)-[\d.]+/);
  if (m) aicqMap[`@aicqtools/${m[1]}`] = `file:${t}`;
}
console.log('aicq deps map:', aicqMap);
if (!aicqMap['@aicqtools/cli']) {
  console.error('FAIL: @aicqtools/cli tarball is required');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'aicq-isolation-'));
console.log(`\nTempdir: ${dir}`);

const pkg = {
  name: 'aicq-isolation-test',
  version: '0.0.0',
  private: true,
  type: 'module',
  dependencies: aicqMap,
};
writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

console.log('\n--- npm install --legacy-peer-deps ---');
execSync('npm install --legacy-peer-deps --no-audit --no-fund', {
  cwd: dir,
  stdio: 'inherit',
});

// (1) Single tree-sitter copy invariant
console.log('\n--- tree-sitter copy count ---');
const findOut = execSync(
  `find node_modules -name package.json -path "*/tree-sitter/*" -not -path "*/tree-sitter-*/*"`,
  { cwd: dir, encoding: 'utf-8', shell: '/bin/bash' },
).trim();
const copies = findOut.split('\n').filter(Boolean);
console.log(copies.join('\n'));
if (copies.length !== 1) {
  console.error(`\nFAIL: expected exactly 1 tree-sitter copy, found ${copies.length}`);
  process.exit(1);
}
console.log(`PASS: single tree-sitter copy hoisted`);

// (2) Bisect — load builtin rules via the installed guardrail dist and run on
// a synthetic .ts source that exercises all four trigger patterns.
console.log('\n--- bisect: 4 YAML pattern rules on a real .ts source ---');
const grUrl = pathToFileURL(
  join(dir, 'node_modules', '@aicqtools', 'guardrail', 'dist', 'index.js'),
).href;
const rfUrl = pathToFileURL(
  join(dir, 'node_modules', '@aicqtools', 'guardrail', 'dist', 'runner', 'run-file.js'),
).href;
const gr = await import(grUrl);
const rf = await import(rfUrl);

const allRules = await gr.loadAllBuiltinRules();
console.log(`Loaded ${allRules.length} builtin rules`);

// Test source: mock values only — no real keys (security.md §15)
const target = join(dir, 'sample.ts');
const sampleSource = [
  'import { something } from "lib";',
  'const a = new OpenAI({ apiKey: "test-key-not-real" });',
  'const b = new Anthropic({ apiKey: "test-key-not-real" });',
  'const d = new Date();',
  'const r = Math.round(1.5);',
  'export { a, b, d, r };',
  '',
].join('\n');
writeFileSync(target, sampleSource);

const watch = [
  'no-direct-openai',
  'no-direct-anthropic',
  'no-inline-date',
  'no-inline-math-round',
];

const guilty = [];
for (const rule of allRules) {
  const ruleId = rule.id ?? rule.meta?.id ?? '?';
  try {
    const result = await rf.runFile(target, [rule]);
    const failed = result.diagnostics.find((d) => d.ruleId === '@aicq/parse-failed');
    if (failed) {
      guilty.push({ ruleId, reason: 'parse-failed', message: failed.message });
    }
  } catch (e) {
    guilty.push({ ruleId, reason: 'threw', message: e.message });
  }
}

if (guilty.length > 0) {
  console.error(`\nFAIL: ${guilty.length} guilty rules:`);
  for (const g of guilty) console.error(`  ${g.ruleId} (${g.reason}): ${g.message}`);
  process.exit(1);
}
console.log('PASS: 0 guilty rules — all 4 YAML pattern rules succeed on .ts source');

// Also confirm the 4 watched rules actually matched the synthetic source
const watchedHits = {};
for (const r of allRules.filter((r) => watch.includes(r.id))) {
  const res = await rf.runFile(target, [r]);
  watchedHits[r.id] = res.diagnostics.length;
}
console.log('\nWatched rule hits on synthetic source:');
for (const [id, n] of Object.entries(watchedHits)) console.log(`  ${id}: ${n}`);
const zeroHits = Object.entries(watchedHits).filter(([, n]) => n === 0);
if (zeroHits.length > 0) {
  console.error(
    `\nFAIL: ${zeroHits.length} watched rule(s) matched 0 occurrences — synthetic source might be off:`,
  );
  for (const [id] of zeroHits) console.error(`  ${id}`);
  process.exit(1);
}
console.log('PASS: all 4 watched rules matched the synthetic source');

console.log('\n✅ install-isolation regression: PASS');
