import { stringify as stringifyYaml } from 'yaml';
import type { Locale } from '@aicqtools/core';
import { t } from '@aicqtools/core';
import type { PatternRuleDraft, RuleSuggestion, RuleSuggestionReport } from './types.js';

const NOISY_RATIO = 10;
const MESSAGE_WIDTH = 64;

/** A paste-ready `aicq.config.yaml` fragment that enables the suggested rules. */
export function buildConfigSnippet(suggestions: readonly RuleSuggestion[]): string {
  if (suggestions.length === 0) return '';
  const lines = ['modules:', '  guardrail:', '    rules:'];
  for (const s of suggestions) {
    const level = s.severity === 'error' ? 'error' : 'warn';
    const note =
      s.hits > 0
        ? `  # ${s.hits} hit${s.hits === 1 ? '' : 's'}${s.stackMatch ? ', stack match' : ''}`
        : '  # stack match';
    lines.push(`      ${s.ruleId}: ${level}${note}`);
  }
  return lines.join('\n');
}

export function formatSuggestText(report: RuleSuggestionReport, locale: Locale): string {
  const lines: string[] = [];
  lines.push(
    t(locale, 'cli.rules.suggest.header', {
      files: report.filesScanned,
      langs: report.languagesPresent.length > 0 ? report.languagesPresent.join(', ') : '-',
      ms: report.durationMs,
    }),
  );
  lines.push('');

  if (report.suggestions.length === 0) {
    lines.push(t(locale, 'cli.rules.suggest.none'));
  } else {
    lines.push(t(locale, 'cli.rules.suggest.tableHeader'));
    const noisy = new Set<number>();
    for (let i = 0; i < report.suggestions.length - 1; i++) {
      const cur = report.suggestions[i]?.hits ?? 0;
      const next = report.suggestions[i + 1]?.hits ?? 0;
      if (cur > 0 && next > 0 && cur > next * NOISY_RATIO) noisy.add(i);
    }
    report.suggestions.forEach((s, i) => {
      const flags: string[] = [];
      if (s.stackMatch) flags.push(t(locale, 'cli.rules.suggest.stackMatchNote'));
      if (noisy.has(i)) flags.push(t(locale, 'cli.rules.suggest.noisyNote'));
      const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
      lines.push(`  ${s.ruleId}  ${s.hits}  ${s.severity}  ${truncate(s.message, MESSAGE_WIDTH)}${flagStr}`);
      for (const loc of s.sampleLocations) lines.push(`      ${loc.file}:${loc.line}:${loc.column}`);
    });
  }

  if (report.detectedDependencies.length > 0) {
    lines.push('');
    lines.push(
      t(locale, 'cli.rules.suggest.detectedStack', {
        deps: report.detectedDependencies.map((d) => d.name).join(', '),
      }),
    );
  }

  if (report.configSnippet) {
    lines.push('');
    lines.push(t(locale, 'cli.rules.suggest.configHint'));
    lines.push(report.configSnippet);
  }

  if (report.patternDrafts && report.patternDrafts.length > 0) {
    lines.push('');
    lines.push(t(locale, 'cli.rules.suggest.patternDraftsHeader', { count: report.patternDrafts.length }));
    lines.push(formatPatternDraftsYaml(report.patternDrafts));
  }

  return lines.join('\n');
}

export function formatSuggestYaml(report: RuleSuggestionReport): string {
  const parts: string[] = [];
  if (report.configSnippet) {
    parts.push('# Enable suggested built-in rules — paste into aicq.config.yaml');
    parts.push(report.configSnippet);
  }
  if (report.patternDrafts && report.patternDrafts.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push('# Auto-suggested draft pattern rules — review & edit, then place each under your rulesDir');
    parts.push(formatPatternDraftsYaml(report.patternDrafts));
  }
  return parts.length > 0 ? parts.join('\n') : '# No suggestions.';
}

function formatPatternDraftsYaml(drafts: readonly PatternRuleDraft[]): string {
  return drafts
    .map(
      (d, i) =>
        `# --- draft ${i + 1}/${drafts.length}: ${d.id} (${d.meta.count}x across ${d.meta.files} file${d.meta.files === 1 ? '' : 's'}) ---\n${patternDraftToYaml(d)}`,
    )
    .join('---\n');
}

function patternDraftToYaml(draft: PatternRuleDraft): string {
  return stringifyYaml(
    {
      id: draft.id,
      language: draft.language,
      severity: draft.severity,
      message: draft.message,
      messageKo: draft.messageKo,
      query: draft.query,
    },
    { lineWidth: 0 },
  );
}

function truncate(value: string, max: number): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}
