import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { aicqConfigSchema } from '@aicqtools/core';
import {
  analyzeRepo,
  formatSuggestText,
  formatSuggestYaml,
  loadAllBuiltinRules,
  minePatterns,
} from '../index.js';

const fixtureCwd = fileURLToPath(new URL('./fixtures/suggest-repo', import.meta.url));
const cfg = aicqConfigSchema.parse({});
const base = { cwd: fixtureCwd, include: cfg.include, exclude: cfg.exclude } as const;

describe('analyzeRepo — built-in rule recommender (approach A)', () => {
  it('ranks built-in rules by how many violations they would flag', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules });

    expect(report.filesScanned).toBeGreaterThanOrEqual(2);
    expect(report.languagesPresent).toEqual(expect.arrayContaining(['typescript', 'python']));

    const ids = report.suggestions.map((s) => s.ruleId);
    expect(ids).toContain('no-console-log');

    const noConsole = report.suggestions.find((s) => s.ruleId === 'no-console-log');
    expect(noConsole?.hits).toBeGreaterThanOrEqual(6);
    expect((noConsole?.sampleLocations.length ?? 0) > 0).toBe(true);
    expect(noConsole?.sampleLocations.length ?? 0).toBeLessThanOrEqual(2);

    // mixed-language scan — a Python rule fired too
    expect(ids.some((id) => id === 'requests-needs-timeout' || id === 'no-bare-except')).toBe(true);
  });

  it('detects dependencies and flags stack-matched rules', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules });

    const depNames = report.detectedDependencies.map((d) => d.name);
    expect(depNames).toEqual(expect.arrayContaining(['openai', 'axios', 'requests']));
    expect(report.detectedDependencies.find((d) => d.name === 'requests')?.source).toBe('requirements.txt');
    expect(report.detectedDependencies.find((d) => d.name === 'openai')?.source).toBe('package.json');

    expect(report.suggestions.find((s) => s.ruleId === 'no-direct-openai')?.stackMatch).toBe(true);
  });

  it('honors top + minHits and emits a YAML-parseable config snippet', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 2, minHits: 5 });

    expect(report.suggestions.length).toBeLessThanOrEqual(2);
    for (const s of report.suggestions) {
      expect(s.hits >= 5 || s.stackMatch === true).toBe(true);
    }
    expect(report.configSnippet.length).toBeGreaterThan(0);
    const parsed = parseYaml(report.configSnippet) as {
      modules?: { guardrail?: { rules?: Record<string, string> } };
    };
    expect(parsed.modules?.guardrail?.rules).toBeDefined();
  });
});

describe('minePatterns — AST pattern mining (approach B)', () => {
  it('mines a frequent call pattern into a compilable draft pattern rule', async () => {
    const drafts = await minePatterns({ ...base, minCount: 5 });
    const consoleDraft = drafts.find((d) => d.query.includes('"console"') && d.query.includes('"log"'));

    expect(consoleDraft).toBeDefined();
    expect(consoleDraft?.severity).toBe('info');
    expect(consoleDraft?.message).toMatch(/TODO/);
    expect(consoleDraft?.messageKo).toMatch(/TODO/);
    expect(consoleDraft?.id.startsWith('suggested-')).toBe(true);
    expect(consoleDraft?.meta.count ?? 0).toBeGreaterThanOrEqual(6);

    // The generated query already passed an in-engine compile check; round-trip it as YAML for good measure.
    const yamlDoc = stringifyYaml({
      id: consoleDraft?.id,
      language: consoleDraft?.language,
      severity: consoleDraft?.severity,
      message: consoleDraft?.message,
      messageKo: consoleDraft?.messageKo,
      query: consoleDraft?.query,
    });
    expect(() => parseYaml(yamlDoc)).not.toThrow();
  });

  it('respects minCount — a single occurrence is not drafted', async () => {
    const drafts = await minePatterns({ ...base, minCount: 5 });
    expect(drafts.some((d) => d.query.includes('"OpenAI"'))).toBe(false);
  });
});

describe('formatSuggestText / formatSuggestYaml', () => {
  it('renders a human summary with the rule table (en + ko)', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 5 });

    const en = formatSuggestText(report, 'en');
    expect(en).toContain('no-console-log');
    expect(en).toContain('files scanned');

    const ko = formatSuggestText(report, 'ko');
    expect(ko).toContain('no-console-log');
    expect(ko).toContain('검사');

    expect(formatSuggestYaml(report)).toContain('modules:');
  });

  it('includes pattern-draft YAML when patternDrafts are present', async () => {
    const rules = await loadAllBuiltinRules();
    const baseReport = await analyzeRepo({ ...base, rules, top: 5 });
    const patternDrafts = await minePatterns({ ...base, minCount: 5 });
    const yaml = formatSuggestYaml({ ...baseReport, patternDrafts });

    expect(yaml).toContain('suggested-');
    expect(yaml).toContain('query: |');
  });
});
