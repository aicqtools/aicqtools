import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { aicqConfigSchema, type AicqConfig } from './schema.js';

const CONFIG_FILENAMES = ['aicq.config.yaml', 'aicq.config.yml'] as const;

export async function loadConfig(cwd: string): Promise<AicqConfig> {
  for (const name of CONFIG_FILENAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) {
      const raw = await readFile(path, 'utf-8');
      const parsed = parseYaml(raw) ?? {};
      return aicqConfigSchema.parse(parsed);
    }
  }
  return aicqConfigSchema.parse({});
}

export function findConfigPath(cwd: string): string | null {
  for (const name of CONFIG_FILENAMES) {
    const path = resolve(cwd, name);
    if (existsSync(path)) return path;
  }
  return null;
}
