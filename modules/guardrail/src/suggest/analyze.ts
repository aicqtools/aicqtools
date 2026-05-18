import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import fastGlob from 'fast-glob';
import type { Language } from '@aicqtools/core';
import { detectLanguage } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import { resolveIgnores, runProject } from '../runner/run-project.js';
import { buildConfigSnippet } from './format.js';
import type {
  AnalyzeRepoOptions,
  DetectedDependency,
  RuleSuggestion,
  RuleSuggestionReport,
  SuggestSampleLocation,
} from './types.js';

const PARSE_FAILED_ID = '@aicq/parse-failed';
const DEFAULT_TOP = 10;
const DEFAULT_MIN_HITS = 1;
const MAX_SAMPLE_LOCATIONS = 2;
const MIN_DEP_NAME_LENGTH = 4;
/** When a rule has > NOISY_RATIO times the hits of the next-ranked rule, mark it noisy. */
const NOISY_RATIO = 10;
/** Absolute floor: any info-severity rule that fires more than this is treated as noisy regardless of gap. */
const NOISY_ABS_THRESHOLD = 200;

interface RuleBucket {
  hits: number;
  samples: SuggestSampleLocation[];
}

/**
 * Approach A — built-in rule recommender. Scans the repo with all supplied rules,
 * ranks them by how many violations they would flag, and emits a paste-ready
 * `aicq.config.yaml` enable-snippet. Also reads `package.json` / `requirements.txt`
 * (no AST) and flags built-in rules whose id/docs/message mentions a declared
 * dependency ("stack match").
 */
export async function analyzeRepo(opts: AnalyzeRepoOptions): Promise<RuleSuggestionReport> {
  const top = Math.max(1, opts.top ?? DEFAULT_TOP);
  const minHits = Math.max(1, opts.minHits ?? DEFAULT_MIN_HITS);

  const result = await runProject({
    cwd: opts.cwd,
    include: opts.include,
    exclude: opts.exclude,
    rules: opts.rules,
    ...(opts.cache ? { cache: opts.cache } : {}),
    ...(opts.respectGitignore ? { respectGitignore: true } : {}),
  });

  const byRule = new Map<string, RuleBucket>();
  for (const d of result.diagnostics) {
    if (d.ruleId === PARSE_FAILED_ID) continue;
    let bucket = byRule.get(d.ruleId);
    if (!bucket) {
      bucket = { hits: 0, samples: [] };
      byRule.set(d.ruleId, bucket);
    }
    bucket.hits += 1;
    if (bucket.samples.length < MAX_SAMPLE_LOCATIONS) {
      bucket.samples.push({ file: d.file, line: d.range.start.line, column: d.range.start.column });
    }
  }

  const ruleById = new Map<string, Rule>();
  for (const rule of opts.rules) ruleById.set(rule.id, rule);

  const detectedDependencies = await detectDependencies(opts.cwd);
  const depNames = new Set(
    detectedDependencies
      .map((d) => bareDepName(d.name).toLowerCase())
      .filter((n) => n.length >= MIN_DEP_NAME_LENGTH),
  );
  const stackMatched = new Set<string>();
  for (const rule of opts.rules) {
    if (ruleMentionsDependency(rule, depNames)) stackMatched.add(rule.id);
  }

  const suggestions: RuleSuggestion[] = [];
  for (const [ruleId, bucket] of byRule) {
    const rule = ruleById.get(ruleId);
    if (!rule) continue;
    if (bucket.hits < minHits && !stackMatched.has(ruleId)) continue;
    suggestions.push(makeSuggestion(rule, bucket.hits, bucket.samples, stackMatched.has(ruleId)));
  }
  for (const ruleId of stackMatched) {
    if (byRule.has(ruleId)) continue;
    const rule = ruleById.get(ruleId);
    if (rule) suggestions.push(makeSuggestion(rule, 0, [], true));
  }
  suggestions.sort((a, b) => b.hits - a.hits || a.ruleId.localeCompare(b.ruleId));
  // Mark "noisy" suggestions: those whose hit count is dramatically larger than the next
  // rule's (gap criterion) OR any info-severity rule above the absolute threshold. This
  // information drives both the text reporter's flag and the YAML snippet's comment-out
  // behavior, so we compute it once here.
  const capped = applyNoisyFlag(suggestions.slice(0, top));

  const ignore = await resolveIgnores(opts.cwd, opts.exclude, opts.respectGitignore ?? false);
  const files = await fastGlob([...opts.include], {
    cwd: opts.cwd,
    ignore,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });
  const langSet = new Set<Language>();
  for (const file of files) {
    const lang = detectLanguage(file);
    if (lang) langSet.add(lang);
  }
  const languagesPresent = [...langSet].sort();

  return {
    filesScanned: result.filesScanned,
    languagesPresent,
    durationMs: result.durationMs,
    suggestions: capped,
    detectedDependencies,
    configSnippet: buildConfigSnippet(capped),
  };
}

function makeSuggestion(
  rule: Rule,
  hits: number,
  samples: readonly SuggestSampleLocation[],
  stackMatch: boolean,
): RuleSuggestion {
  return {
    ruleId: rule.id,
    hits,
    severity: rule.severity,
    message: rule.message,
    ...(rule.messageKo ? { messageKo: rule.messageKo } : {}),
    ...(rule.docs ? { docs: rule.docs } : {}),
    sampleLocations: samples,
    ...(stackMatch ? { stackMatch: true } : {}),
    ...(rule.skipPatterns && rule.skipPatterns.length > 0
      ? { skipPatterns: rule.skipPatterns.map((re) => re.source) }
      : {}),
  };
}

function applyNoisyFlag(suggestions: readonly RuleSuggestion[]): RuleSuggestion[] {
  const out = suggestions.map((s) => ({ ...s }));
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    if (!cur) continue;
    const next = out[i + 1];
    const gap = cur.hits > 0 && next && next.hits > 0 && cur.hits > next.hits * NOISY_RATIO;
    const absInfo = cur.severity === 'info' && cur.hits > NOISY_ABS_THRESHOLD;
    if (gap || absInfo) cur.noisy = true;
  }
  return out;
}

function bareDepName(name: string): string {
  return name.startsWith('@') ? (name.split('/').pop() ?? name) : name;
}

function ruleMentionsDependency(rule: Rule, depNames: ReadonlySet<string>): boolean {
  if (depNames.size === 0) return false;
  const idTokens = new Set(rule.id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const firstWord = rule.message.toLowerCase().split(/\s+/)[0] ?? '';
  const docs = (rule.docs ?? '').toLowerCase();
  for (const dep of depNames) {
    if (idTokens.has(dep) || firstWord === dep || (docs.length > 0 && docs.includes(dep))) return true;
  }
  return false;
}

async function detectDependencies(cwd: string): Promise<DetectedDependency[]> {
  const out: DetectedDependency[] = [];
  const seen = new Set<string>();
  const add = (rawName: string, source: DetectedDependency['source']): void => {
    const name = rawName.trim();
    if (!name || seen.has(`${source}:${name}`)) return;
    seen.add(`${source}:${name}`);
    out.push({ name, source });
  };

  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as Record<string, unknown>;
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        const deps = pkg[key];
        if (deps && typeof deps === 'object' && !Array.isArray(deps)) {
          for (const name of Object.keys(deps as Record<string, unknown>)) add(name, 'package.json');
        }
      }
    } catch {
      /* ignore unreadable / invalid package.json */
    }
  }

  const reqPath = resolve(cwd, 'requirements.txt');
  if (existsSync(reqPath)) {
    try {
      const txt = await readFile(reqPath, 'utf-8');
      for (const line of txt.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
        const name = trimmed.split(/[<>=!~;[\s]/)[0];
        if (name) add(name, 'requirements.txt');
      }
    } catch {
      /* ignore unreadable requirements.txt */
    }
  }
  return out;
}
