import type { Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';

export interface RenderOptions {
  readonly locale: 'ko' | 'en';
}

function severityOrder(s: Severity): number {
  if (s === 'error') return 0;
  if (s === 'warning') return 1;
  return 2;
}

function sectionTitle(locale: 'ko' | 'en', s: Severity): string {
  if (locale === 'ko') {
    if (s === 'error') return '## 오류 (반드시 지킬 것)';
    if (s === 'warning') return '## 경고';
    return '## 정보';
  }
  if (s === 'error') return '## Errors (must not violate)';
  if (s === 'warning') return '## Warnings';
  return '## Info';
}

function header(locale: 'ko' | 'en'): string {
  if (locale === 'ko') {
    return `# AI 코딩 가이드라인\n\n아래 규칙은 aicq가 커밋 단계에서 강제합니다. 자동 생성된 내용 — 수정은 \`aicq/rules/\` 에서.`;
  }
  return `# AI Coding Guidelines\n\nThe rules below are enforced by aicq at commit time. Generated automatically — edit \`aicq/rules/\` to change.`;
}

function getMessage(rule: Rule, locale: 'ko' | 'en'): string {
  if (locale === 'ko' && rule.messageKo) return rule.messageKo;
  return rule.message;
}

function renderRule(rule: Rule, locale: 'ko' | 'en'): string {
  const langs = Array.isArray(rule.language) ? rule.language : [rule.language];
  return `### ${rule.id}\n${getMessage(rule, locale)}\n- Languages: ${langs.join(', ')}`;
}

export function renderRules(rules: readonly Rule[], opts: RenderOptions): string {
  const sorted = [...rules].sort((a, b) => {
    const sev = severityOrder(a.severity) - severityOrder(b.severity);
    return sev !== 0 ? sev : a.id.localeCompare(b.id);
  });

  const lines: string[] = [header(opts.locale), ''];
  let lastSeverity: Severity | null = null;
  for (const rule of sorted) {
    if (rule.severity !== lastSeverity) {
      lines.push('');
      lines.push(sectionTitle(opts.locale, rule.severity));
      lines.push('');
      lastSeverity = rule.severity;
    }
    lines.push(renderRule(rule, opts.locale));
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export const MARKER_START = '<!-- aicq:rules:start -->';
export const MARKER_END = '<!-- aicq:rules:end -->';

export function injectIntoMarkdown(existing: string | null, body: string): string {
  const block = `${MARKER_START}\n${body}${MARKER_END}\n`;
  if (existing === null || existing.length === 0) return block;
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    const sep = existing.endsWith('\n') ? '\n' : '\n\n';
    return `${existing}${sep}${block}`;
  }
  return `${existing.slice(0, startIdx)}${block}${existing.slice(endIdx + MARKER_END.length).replace(/^\n/, '')}`;
}
