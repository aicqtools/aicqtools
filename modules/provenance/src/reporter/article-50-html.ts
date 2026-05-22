import type { Article50Report, GuardrailSummary } from './article-50.js';

export interface RenderHtmlOptions {
  readonly locale?: 'ko' | 'en';
}

type LocaleMessages = { readonly [K in keyof (typeof messages)['en']]: string };

const messages = {
  ko: {
    title: 'EU AI Act Article 50 컴플라이언스 리포트',
    subtitle: 'AI 코드 출처 투명성 명세',
    generatedAt: '생성 일시',
    formatId: '포맷 식별자',
    aiSystems: 'AI 시스템',
    tool: '도구',
    model: '모델',
    modelVersion: '모델 버전',
    sessionCount: '세션 수',
    attributedFiles: '출처 명시 파일',
    none: '(없음)',
    notAvailable: '미상',
    guardrailSummary: '가드레일 위반 요약',
    noViolations: '(검출된 위반 없음)',
    totalViolations: '총 위반',
    filesWithViolations: '위반 포함 파일',
    severityBreakdown: '심각도 분포',
    categoryBreakdown: '룰 카테고리 분포',
    severityError: '오류',
    severityWarning: '경고',
    severityInfo: '정보',
    severity: '심각도',
    ruleId: '룰 ID',
    count: '개수',
    footer: 'aicqtools provenance · MIT License · https://github.com/aicqtools/aicqtools',
  },
  en: {
    title: 'EU AI Act Article 50 Compliance Report',
    subtitle: 'AI code provenance transparency disclosure',
    generatedAt: 'Generated at',
    formatId: 'Format ID',
    aiSystems: 'AI Systems',
    tool: 'Tool',
    model: 'Model',
    modelVersion: 'Model Version',
    sessionCount: 'Session Count',
    attributedFiles: 'Attributed Files',
    none: '(none)',
    notAvailable: 'n/a',
    guardrailSummary: 'Guardrail violations summary',
    noViolations: '(no violations detected)',
    totalViolations: 'Total violations',
    filesWithViolations: 'Files with violations',
    severityBreakdown: 'Severity breakdown',
    categoryBreakdown: 'Rule category breakdown',
    severityError: 'Error',
    severityWarning: 'Warning',
    severityInfo: 'Info',
    severity: 'Severity',
    ruleId: 'Rule ID',
    count: 'Count',
    footer: 'aicqtools provenance · MIT License · https://github.com/aicqtools/aicqtools',
  },
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderGuardrailSection(summary: GuardrailSummary, m: LocaleMessages): string {
  // No violations: keep the section but show a friendly empty state.
  if (summary.totalViolations === 0) {
    return `
<section>
  <h2>${m.guardrailSummary}</h2>
  <p class="empty">${m.noViolations}</p>
</section>
`;
  }

  const severityLabel: Readonly<Record<'error' | 'warning' | 'info', string>> = {
    error: m.severityError,
    warning: m.severityWarning,
    info: m.severityInfo,
  };

  // Severity rows in fixed order: error → warning → info (stable for diff-friendly fixtures).
  const severityRows = (['error', 'warning', 'info'] as const)
    .map(
      (sev) => `<tr>
              <td>${severityLabel[sev]}</td>
              <td class="num">${summary.severityCount[sev]}</td>
            </tr>`,
    )
    .join('\n');

  // Category rows sorted by count desc, then ruleId asc — stable & readable.
  const categoryRows = Object.entries(summary.categoryCount)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(
      ([ruleId, count]) => `<tr>
              <td><code>${escapeHtml(ruleId)}</code></td>
              <td class="num">${count}</td>
            </tr>`,
    )
    .join('\n');

  return `
<section>
  <h2>${m.guardrailSummary}</h2>
  <dl class="meta">
    <dt>${m.totalViolations}</dt><dd>${summary.totalViolations}</dd>
    <dt>${m.filesWithViolations}</dt><dd>${summary.filesWithViolations}</dd>
  </dl>
  <h3>${m.severityBreakdown}</h3>
  <table>
    <thead>
      <tr>
        <th>${m.severity}</th>
        <th class="num">${m.count}</th>
      </tr>
    </thead>
    <tbody>
${severityRows}
    </tbody>
  </table>
  <h3>${m.categoryBreakdown}</h3>
  <table>
    <thead>
      <tr>
        <th>${m.ruleId}</th>
        <th class="num">${m.count}</th>
      </tr>
    </thead>
    <tbody>
${categoryRows}
    </tbody>
  </table>
</section>
`;
}

export function renderArticle50Html(report: Article50Report, opts: RenderHtmlOptions = {}): string {
  const locale = opts.locale ?? 'en';
  const m = messages[locale];

  const systemsRows =
    report.aiSystems.length === 0
      ? `<tr><td colspan="4" class="empty">${m.none}</td></tr>`
      : report.aiSystems
          .map(
            (s) => `<tr>
              <td>${escapeHtml(s.tool)}</td>
              <td>${escapeHtml(s.model)}</td>
              <td>${s.modelVersion ? escapeHtml(s.modelVersion) : `<span class="muted">${m.notAvailable}</span>`}</td>
              <td class="num">${s.sessionCount}</td>
            </tr>`,
          )
          .join('\n');

  const fileItems =
    report.attributedFiles.length === 0
      ? `<li class="empty">${m.none}</li>`
      : report.attributedFiles.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('\n');

  const guardrailSection = report.guardrailSummary
    ? renderGuardrailSection(report.guardrailSummary, m)
    : '';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(m.title)}</title>
<style>
  :root {
    --fg: #1a1a1a;
    --muted: #6b6b6b;
    --border: #e1e4e8;
    --bg-alt: #f6f8fa;
    --accent: #0366d6;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", sans-serif;
    color: var(--fg);
    line-height: 1.6;
    max-width: 880px;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }
  header { border-bottom: 2px solid var(--fg); padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
  .subtitle { color: var(--muted); margin: 0; }
  .meta { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin-top: 1rem; font-size: 0.9rem; }
  .meta dt { color: var(--muted); }
  .meta dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
  h2 { font-size: 1.25rem; margin-top: 2rem; padding-bottom: 0.25rem; border-bottom: 1px solid var(--border); }
  h3 { font-size: 1rem; margin-top: 1.25rem; margin-bottom: 0.25rem; color: var(--muted); font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
  th, td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
  th { background: var(--bg-alt); font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); }
  .empty { color: var(--muted); font-style: italic; text-align: center; }
  ul { padding-left: 1.25rem; }
  code { background: var(--bg-alt); padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.875rem; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.8rem; text-align: center; }
  @media print {
    body { margin: 0; max-width: none; }
    header { page-break-after: avoid; }
    h2 { page-break-after: avoid; }
    table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(m.title)}</h1>
  <p class="subtitle">${escapeHtml(m.subtitle)}</p>
  <dl class="meta">
    <dt>${m.generatedAt}</dt><dd>${escapeHtml(report.generatedAt)}</dd>
    <dt>${m.formatId}</dt><dd>${escapeHtml(report.format)}</dd>
  </dl>
</header>

<section>
  <h2>${m.aiSystems}</h2>
  <table>
    <thead>
      <tr>
        <th>${m.tool}</th>
        <th>${m.model}</th>
        <th>${m.modelVersion}</th>
        <th class="num">${m.sessionCount}</th>
      </tr>
    </thead>
    <tbody>
${systemsRows}
    </tbody>
  </table>
</section>

<section>
  <h2>${m.attributedFiles}</h2>
  <ul>
${fileItems}
  </ul>
</section>
${guardrailSection}
<footer>${m.footer}</footer>
</body>
</html>
`;
}
