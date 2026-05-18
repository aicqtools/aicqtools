import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { aicqConfigSchema, loadConfig } from '@aicqtools/core';
import { analyzeRepo, formatSuggestYaml, loadAllBuiltinRules } from '../index.js';

const fixtureCwd = fileURLToPath(new URL('./fixtures/suggest-repo', import.meta.url));
const cfg = aicqConfigSchema.parse({});
const base = { cwd: fixtureCwd, include: cfg.include, exclude: cfg.exclude } as const;

/**
 * Alpha.12 항목 B 회귀 가드 — `formatSuggestYaml` 출력은 사용자가 `aicq.config.yaml`에
 * 그대로 복붙해 `aicq check`를 통과할 수 있어야 한다는 paste-ready 계약. 알파.11 이전엔
 * 수동 dogfood로만 확인되던 항목을 영구 가드로 승격.
 */
describe('formatSuggestYaml — paste-ready round-trip (alpha.12 B축)', () => {
  it('round-trips through loadConfig from a tmpdir without throwing', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 10 });
    const yaml = formatSuggestYaml(report, 'en');

    const tmp = mkdtempSync(join(tmpdir(), 'aicq-roundtrip-'));
    try {
      writeFileSync(join(tmp, 'aicq.config.yaml'), yaml, 'utf-8');
      const loaded = await loadConfig(tmp);
      // The snippet at least populates the guardrail rule map (or leaves it untouched if every
      // suggestion was commented out — the call must still succeed in both cases).
      expect(loaded).toBeDefined();
      expect(loaded.modules).toBeDefined();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('survives the alpha.12 auto-skips comment without breaking the yaml parser', async () => {
    const rules = await loadAllBuiltinRules();
    const report = await analyzeRepo({ ...base, rules, top: 10 });

    // Guard the prerequisite of this test — at least one suggestion must carry skipPatterns
    // otherwise we are not exercising the alpha.12 comment path at all.
    expect(report.suggestions.some((s) => (s.skipPatterns?.length ?? 0) > 0)).toBe(true);

    const yaml = formatSuggestYaml(report, 'en');
    expect(yaml).toMatch(/auto-skips:/);

    // Direct parse — auto-skips lives inside `# …` comments, so parseYaml must succeed even
    // if the regex source contains `:` or other YAML-significant characters.
    expect(() => parseYaml(yaml)).not.toThrow();

    // Same content via aicqConfigSchema — schema layer is the actual gate `aicq check` hits.
    const parsed = parseYaml(yaml) ?? {};
    expect(() => aicqConfigSchema.parse(parsed)).not.toThrow();
  });

  it('handles the empty-report fallback (`# No suggestions.`) without parser failure', () => {
    const empty = formatSuggestYaml({
      filesScanned: 0,
      languagesPresent: [],
      durationMs: 0,
      suggestions: [],
      detectedDependencies: [],
      configSnippet: '',
    });
    expect(empty).toContain('# No suggestions.');
    expect(() => parseYaml(empty)).not.toThrow();
  });
});
