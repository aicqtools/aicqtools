// Verifies that aicq's parser handles ≥32KB inputs without throwing.
// Regression guard for the tree-sitter@0.21.1 32,768-byte native-binding bug
// fixed by upgrading to tree-sitter@~0.22.4 in alpha.3.

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, 'src');
const corePath = join(here, '..', '..', 'packages', 'core', 'dist', 'index.js');

const { parseSource, detectLanguage } = await import(pathToFileURL(corePath).href);

const files = await readdir(srcDir);
let pass = 0;
let fail = 0;
for (const name of files.sort()) {
  const path = join(srcDir, name);
  const ext = extname(name);
  const lang = detectLanguage(name);
  if (!lang) {
    console.log(`SKIP ${name} (no language for ${ext})`);
    continue;
  }
  const src = await readFile(path, 'utf-8');
  const size = (await stat(path)).size;
  try {
    const tree = parseSource(lang, src);
    const expectedRoot = lang === 'python' ? 'module' : 'program';
    if (tree.rootNode.type !== expectedRoot) {
      console.error(`FAIL ${name} (${size} bytes, ${lang}): rootNode.type=${tree.rootNode.type}, expected ${expectedRoot}`);
      fail++;
      continue;
    }
    if (tree.rootNode.hasError) {
      console.error(`FAIL ${name} (${size} bytes, ${lang}): hasError=true (fixture syntactically invalid)`);
      fail++;
      continue;
    }
    console.log(`PASS ${name} (${size} bytes, ${lang})`);
    pass++;
  } catch (err) {
    console.error(`FAIL ${name} (${size} bytes, ${lang}): ${err instanceof Error ? err.message : String(err)}`);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
