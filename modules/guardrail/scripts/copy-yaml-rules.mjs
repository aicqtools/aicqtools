import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../src/rules-default');
const dest = resolve(here, '../dist/rules-default');

await mkdir(dest, { recursive: true });
const entries = await readdir(src);
let copied = 0;
for (const entry of entries) {
  const ext = extname(entry);
  if (ext === '.yaml' || ext === '.yml') {
    await copyFile(join(src, entry), join(dest, entry));
    copied += 1;
  }
}
process.stdout.write(`copy-yaml-rules: ${copied} file(s)\n`);
