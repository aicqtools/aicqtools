import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { runProject, loadAllBuiltinRules } from '../../modules/guardrail/dist/index.js';
import { FileCache } from '../../packages/core/dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(here, '../bench-fixture');
const cachePath = resolve(fixture, '.aicq/cache.sqlite');

const rules = await loadAllBuiltinRules();
process.stdout.write(`loaded ${rules.length} builtin rules\n`);

if (existsSync(cachePath)) await unlink(cachePath);

// Cold run — no cache
const tCold = Date.now();
const cold = await runProject({
  cwd: fixture,
  include: ['src/**/*.ts'],
  exclude: ['**/node_modules/**'],
  rules,
});
const coldMs = Date.now() - tCold;

// Warm-up: populate cache
const cache = new FileCache(cachePath);
try {
  await runProject({
    cwd: fixture,
    include: ['src/**/*.ts'],
    exclude: ['**/node_modules/**'],
    rules,
    cache,
  });

  // Warm run — cache hit
  const tWarm = Date.now();
  const warm = await runProject({
    cwd: fixture,
    include: ['src/**/*.ts'],
    exclude: ['**/node_modules/**'],
    rules,
    cache,
  });
  const warmMs = Date.now() - tWarm;

  const result = {
    files: cold.filesScanned,
    diagnostics: cold.diagnostics.length,
    coldMs,
    warmMs,
    speedup: warmMs > 0 ? (coldMs / warmMs).toFixed(2) : 'inf',
    targetColdMs: 5000,
    targetWarmMs: 1000,
    coldPass: coldMs <= 5000,
    warmPass: warmMs <= 1000,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.coldPass) {
    process.stderr.write(`FAIL: cold ${coldMs}ms > 5000ms target\n`);
    process.exit(1);
  }
  if (!result.warmPass) {
    process.stderr.write(`FAIL: warm ${warmMs}ms > 1000ms target\n`);
    process.exit(1);
  }
} finally {
  cache.close();
}
