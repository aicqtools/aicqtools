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
    // tracker.report() is non-stdlib and fires 6 times — should be drafted.
    const trackerDraft = drafts.find((d) => d.query.includes('"tracker"') && d.query.includes('"report"'));

    expect(trackerDraft).toBeDefined();
    expect(trackerDraft?.severity).toBe('info');
    expect(trackerDraft?.message).toMatch(/TODO/);
    expect(trackerDraft?.messageKo).toMatch(/TODO/);
    expect(trackerDraft?.id.startsWith('suggested-')).toBe(true);
    expect(trackerDraft?.meta.count ?? 0).toBeGreaterThanOrEqual(6);

    // The generated query already passed an in-engine compile check; round-trip it as YAML for good measure.
    const yamlDoc = stringifyYaml({
      id: trackerDraft?.id,
      language: trackerDraft?.language,
      severity: trackerDraft?.severity,
      message: trackerDraft?.message,
      messageKo: trackerDraft?.messageKo,
      query: trackerDraft?.query,
    });
    expect(() => parseYaml(yamlDoc)).not.toThrow();
  });

  it('respects minCount — a single occurrence is not drafted', async () => {
    const drafts = await minePatterns({ ...base, minCount: 5 });
    expect(drafts.some((d) => d.query.includes('"OpenAI"'))).toBe(false);
  });

  it('filters stdlib / global identifiers from drafted patterns', async () => {
    // console.log fires 6 times in the fixture — the stdlib blocklist must keep `console.log`,
    // `JSON.parse`, `new Map()`, etc. from polluting the suggested draft set.
    const drafts = await minePatterns({ ...base, minCount: 5 });
    expect(drafts.some((d) => d.query.includes('"console"'))).toBe(false);
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
    // Banner is present in the snippet (alpha.7) so users see the warning before pasting.
    expect(yaml).toContain('aicq rules suggest');
    expect(yaml).toContain('EXPERIMENTAL');
  });

  it('emits info-severity rules as commented-out lines in the snippet', async () => {
    const rules = await loadAllBuiltinRules();
    // top:10 ensures we capture at least one info-severity rule (no-console-log is `warning`,
    // but several built-ins are `info`).
    const report = await analyzeRepo({ ...base, rules, top: 10 });
    const yaml = formatSuggestYaml(report);

    // Any line that starts with `#      ` followed by a rule id is a commented-out suggestion.
    // We just need to confirm the mechanism produces SOME commented line for an info rule,
    // and that error-severity rules are NOT commented out.
    const hasCommentedRule = yaml.split('\n').some((l) => /^#\s+\w[\w-]*: (warn|error)/.test(l));
    const errorRules = report.suggestions.filter((s) => s.severity === 'error');
    if (errorRules.length > 0) {
      // Error rule lines must appear *active* (no leading `#`).
      const firstError = errorRules[0]!;
      const pattern = new RegExp(`^      ${firstError.ruleId}: error`, 'm');
      expect(yaml).toMatch(pattern);
    }
    // If we have info or noisy suggestions, at least one line should be commented out.
    const hasInfoOrNoisy = report.suggestions.some((s) => s.severity === 'info' || s.noisy);
    if (hasInfoOrNoisy) expect(hasCommentedRule).toBe(true);
  });
});

describe('formatSuggest — skipPatterns surfacing (alpha.12)', () => {
  it('renders ↳ auto-skipped paths hint in en text under a rule with SKIP_FILE_RE meta', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 10 });

    const en = formatSuggestText(report, 'en');
    const noConsole = report.suggestions.find((s) => s.ruleId === 'no-console-log');
    expect(noConsole?.skipPatterns?.length ?? 0).toBeGreaterThan(0);
    expect(en).toContain('↳ auto-skipped paths:');
  });

  it('renders ↳ 자동 스킵 경로 hint in ko text', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 10 });

    const ko = formatSuggestText(report, 'ko');
    expect(ko).toContain('↳ 자동 스킵 경로:');
  });

  it('embeds auto-skips comment in yaml snippet without breaking parseYaml', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 10 });
    const yaml = formatSuggestYaml(report);

    // At least one rule must carry the auto-skips note.
    expect(yaml).toMatch(/auto-skips:/);

    // The yaml must still parse — the auto-skips note lives inside a `#` comment, so the
    // parser treats it as a no-op even if the regex source contains `:` or other YAML-significant
    // characters.
    expect(() => parseYaml(yaml)).not.toThrow();
  });
});
