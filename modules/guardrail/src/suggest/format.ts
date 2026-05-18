import { stringify as stringifyYaml } from 'yaml';
import type { Locale } from '@aicqtools/core';
import { t } from '@aicqtools/core';
import type { PatternRuleDraft, RuleSuggestion, RuleSuggestionReport } from './types.js';

const MESSAGE_WIDTH = 64;
const SKIP_PATTERNS_WIDTH = 80;

/**
 * A paste-ready `aicq.config.yaml` fragment that enables the suggested rules.
 *
 * Info-severity and `noisy`-flagged rules are emitted as **commented-out** lines with a note —
 * pasting the snippet as-is never floods the project with low-signal diagnostics, but the
 * reader sees that those rules exist and can uncomment them after tuning.
 */
export function buildConfigSnippet(suggestions: readonly RuleSuggestion[]): string {
  if (suggestions.length === 0) return '';
  const lines = ['modules:', '  guardrail:', '    rules:'];
  for (const s of suggestions) {
    const level = s.severity === 'error' ? 'error' : 'warn';
    const noteParts: string[] = [];
    if (s.hits > 0) noteParts.push(`${s.hits} hit${s.hits === 1 ? '' : 's'}`);
    if (s.stackMatch) noteParts.push('stack match');
    const commentOut = s.severity === 'info' || s.noisy === true;
    if (commentOut) noteParts.push(`${s.severity} severity, likely noisy — review & tune before enabling`);
    if (s.skipPatterns && s.skipPatterns.length > 0) {
      noteParts.push(`auto-skips: ${truncate(s.skipPatterns.join(', '), SKIP_PATTERNS_WIDTH)}`);
    }
    const note = noteParts.length > 0 ? `  # ${noteParts.join(', ')}` : '';
    const prefix = commentOut ? '#      ' : '      ';
    lines.push(`${prefix}${s.ruleId}: ${level}${note}`);
  }
  return lines.join('\n');
}

/**
 * Renders a multi-line banner suitable for placing above `buildConfigSnippet`'s output.
 * Uses YAML `#` comments so the entire result is paste-safe.
 */
function snippetBanner(locale: Locale): string {
  const date = new Date().toISOString().slice(0, 10);
  return t(locale, 'cli.rules.suggest.snippetBanner', { date })
    .split('\n')
    .map((line) => `# ${line}`)
    .join('\n');
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
    report.suggestions.forEach((s) => {
      const flags: string[] = [];
      if (s.stackMatch) flags.push(t(locale, 'cli.rules.suggest.stackMatchNote'));
      if (s.noisy) flags.push(t(locale, 'cli.rules.suggest.noisyNote'));
      const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
      lines.push(`  ${s.ruleId}  ${s.hits}  ${s.severity}  ${truncate(s.message, MESSAGE_WIDTH)}${flagStr}`);
      for (const loc of s.sampleLocations) lines.push(`      ${loc.file}:${loc.line}:${loc.column}`);
      if (s.skipPatterns && s.skipPatterns.length > 0) {
        lines.push(
          `      ${t(locale, 'cli.rules.suggest.skipPatternsHint', {
            patterns: truncate(s.skipPatterns.join(', '), SKIP_PATTERNS_WIDTH),
          })}`,
        );
      }
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
    lines.push(snippetBanner(locale));
    lines.push(report.configSnippet);
  }

  if (report.patternDrafts && report.patternDrafts.length > 0) {
    lines.push('');
    lines.push(t(locale, 'cli.rules.suggest.patternDraftsHeader', { count: report.patternDrafts.length }));
    lines.push(formatPatternDraftsYaml(report.patternDrafts, locale));
  }

  return lines.join('\n');
}

export function formatSuggestYaml(report: RuleSuggestionReport, locale: Locale = 'en'): string {
  const parts: string[] = [];
  if (report.configSnippet) {
    parts.push(snippetBanner(locale));
    parts.push(report.configSnippet);
  }
  if (report.patternDrafts && report.patternDrafts.length > 0) {
    if (parts.length > 0) parts.push('');
    parts.push(`# ${t(locale, 'cli.rules.suggest.patternDraftsBanner')}`);
    parts.push(formatPatternDraftsYaml(report.patternDrafts, locale));
  }
  return parts.length > 0 ? parts.join('\n') : '# No suggestions.';
}

function formatPatternDraftsYaml(drafts: readonly PatternRuleDraft[], locale: Locale): string {
  const expHeader = t(locale, 'cli.rules.suggest.experimentalLabel');
  return drafts
    .map(
      (d, i) =>
        `# --- ${expHeader} draft ${i + 1}/${drafts.length}: ${d.id} (${d.meta.count}x across ${d.meta.files} file${d.meta.files === 1 ? '' : 's'}) ---\n${patternDraftToYaml(d)}`,
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
