// Generates large but valid TSX / TS / Python fixtures to guard against the
// tree-sitter 32KB native-binding regression that blocked alpha.2 on TalkUp's
// CharacterForm.tsx (49,961 bytes).
//
// Output layout (gitignored):
//   src/large-32k.tsx
//   src/large-50k.tsx
//   src/large-100k.tsx
//   src/large-32k.ts
//   src/large-50k.ts
//   src/large-32k.py
//   src/large-50k.py

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'src');

function buildTsx(targetBytes) {
  const header =
    "import type { ChangeEvent } from 'react';\n" +
    "\n" +
    "type FormState = Record<string, string>;\n" +
    "\n" +
    "export function LargeForm(props: { state: FormState; set: (k: string) => (e: ChangeEvent<HTMLInputElement>) => void }) {\n" +
    "  const { state, set } = props;\n" +
    "  return (\n" +
    "    <form>\n";
  const footer = "    </form>\n  );\n}\n";
  let body = '';
  let i = 0;
  while (header.length + body.length + footer.length < targetBytes) {
    body +=
      `      <label key="f${i}">\n` +
      `        <span>Field ${i}</span>\n` +
      `        <input name="f${i}" value={state.f${i}} onChange={set('f${i}')} />\n` +
      `      </label>\n`;
    i++;
  }
  return header + body + footer;
}

function buildTs(targetBytes) {
  const header =
    'export interface Config { name: string; value: number }\n' +
    'export const entries: Config[] = [\n';
  const footer = '];\n';
  let body = '';
  let i = 0;
  while (header.length + body.length + footer.length < targetBytes) {
    body += `  { name: 'item_${i}', value: ${i} },\n`;
    i++;
  }
  return header + body + footer;
}

function buildPy(targetBytes) {
  const header = '# Generated python fixture\n\nentries = [\n';
  const footer = ']\n';
  let body = '';
  let i = 0;
  while (header.length + body.length + footer.length < targetBytes) {
    body += `    {"name": "item_${i}", "value": ${i}},\n`;
    i++;
  }
  return header + body + footer;
}

const targets = [
  { name: 'large-32k.tsx', build: buildTsx, bytes: 32_768 },
  { name: 'large-50k.tsx', build: buildTsx, bytes: 51_200 },
  { name: 'large-100k.tsx', build: buildTsx, bytes: 102_400 },
  { name: 'large-32k.ts', build: buildTs, bytes: 32_768 },
  { name: 'large-50k.ts', build: buildTs, bytes: 51_200 },
  { name: 'large-32k.py', build: buildPy, bytes: 32_768 },
  { name: 'large-50k.py', build: buildPy, bytes: 51_200 },
];

await mkdir(outDir, { recursive: true });
for (const t of targets) {
  const content = t.build(t.bytes);
  const path = join(outDir, t.name);
  await writeFile(path, content, 'utf-8');
  console.log(`wrote ${t.name}: ${Buffer.byteLength(content, 'utf-8')} bytes`);
}
