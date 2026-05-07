import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Rule } from '@aicqtools/rule-sdk';
import { parseYamlRule } from '../matcher/yaml-rule.js';
import noConsoleLog from './no-console-log.js';
import noIdOverwrite from './no-id-overwrite.js';
import routeNeedsRateLimit from './route-needs-rate-limit.js';
import controllerNeedsAsyncWrapper from './controller-needs-async-wrapper.js';
import fkNeedsOnDelete from './fk-needs-on-delete.js';
import apiResponseShape from './api-response-shape.js';

export const builtinFunctionRules: readonly Rule[] = [
  noConsoleLog,
  noIdOverwrite,
  routeNeedsRateLimit,
  controllerNeedsAsyncWrapper,
  fkNeedsOnDelete,
  apiResponseShape,
];

export async function loadBuiltinYamlRules(): Promise<Rule[]> {
  const dir = dirname(fileURLToPath(import.meta.url));
  const entries = await readdir(dir);
  const rules: Rule[] = [];
  for (const entry of entries) {
    if (extname(entry) === '.yaml' || extname(entry) === '.yml') {
      const content = await readFile(join(dir, entry), 'utf-8');
      rules.push(parseYamlRule(content));
    }
  }
  return rules;
}

export async function loadAllBuiltinRules(): Promise<Rule[]> {
  const yaml = await loadBuiltinYamlRules();
  return [...builtinFunctionRules, ...yaml];
}

export async function loadFunctionRulesFromDir(dir: string): Promise<Rule[]> {
  const absDir = resolve(dir);
  const entries = await readdir(absDir);
  const rules: Rule[] = [];
  for (const entry of entries) {
    if (extname(entry) === '.ts' || extname(entry) === '.js' || extname(entry) === '.mjs') {
      const url = pathToFileURL(join(absDir, entry)).href;
      const mod = (await import(url)) as { default?: Rule };
      if (mod.default) rules.push(mod.default);
    }
  }
  return rules;
}
