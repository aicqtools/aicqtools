import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Generates a synthetic ~10k-line TypeScript codebase for benchmarking.
 *
 * Layout: e2e/bench-fixture/src/file-NNN.ts × FILES files, each LINES lines.
 * A small fraction of files contain rule violations to exercise the detector
 * (no-console-log, no-direct-openai).
 */

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../bench-fixture/src');
await mkdir(target, { recursive: true });

const FILES = 100;
const LINES_PER_FILE = 100;

function generate(idx) {
  const lines = [];
  lines.push(`// Synthetic benchmark file ${idx}`);
  lines.push(`export function fn${idx}(x: number): number {`);
  for (let i = 0; i < LINES_PER_FILE - 6; i++) {
    if (idx % 10 === 0 && i === 5) {
      lines.push(`  console.log("debug ${idx}");`);
    } else if (idx % 25 === 0 && i === 10) {
      lines.push(`  const c${i} = new OpenAI({ apiKey: "x" });`);
    } else {
      lines.push(`  const v${i}_${idx} = x + ${i};`);
    }
  }
  lines.push(`  return x;`);
  lines.push(`}`);
  return lines.join('\n') + '\n';
}

let totalLines = 0;
for (let i = 0; i < FILES; i++) {
  const content = generate(i);
  totalLines += content.split('\n').length;
  const name = `file-${i.toString().padStart(3, '0')}.ts`;
  await writeFile(resolve(target, name), content, 'utf-8');
}

process.stdout.write(`generated ${FILES} files, ${totalLines} lines\n`);
