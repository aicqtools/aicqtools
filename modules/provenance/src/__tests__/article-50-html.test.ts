import { describe, expect, it } from 'vitest';
import { renderArticle50Html } from '../reporter/article-50-html.js';
import type { Article50Report } from '../reporter/article-50.js';

const baseReport: Article50Report = {
  format: 'aicq-article50/0.1',
  generatedAt: '2026-05-08T12:00:00Z',
  aiSystems: [
    {
      tool: 'claude-code',
      model: 'claude-opus-4-7',
      modelVersion: '2.1.132',
      sessionCount: 3,
    },
    {
      tool: 'cursor',
      model: 'unknown',
      modelVersion: null,
      sessionCount: 1,
    },
  ],
  attributedFiles: ['src/index.ts', 'src/utils.ts'],
};

describe('renderArticle50Html', () => {
  it('renders a complete HTML document with English locale by default', () => {
    const html = renderArticle50Html(baseReport);
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('lang="en"');
    expect(html).toContain('EU AI Act Article 50 Compliance Report');
    expect(html).toContain('AI Systems');
    expect(html).toContain('Attributed Files');
  });

  it('renders Korean locale', () => {
    const html = renderArticle50Html(baseReport, { locale: 'ko' });
    expect(html).toContain('lang="ko"');
    expect(html).toContain('EU AI Act Article 50 컴플라이언스 리포트');
    expect(html).toContain('AI 시스템');
    expect(html).toContain('출처 명시 파일');
  });

  it('escapes HTML special characters in input fields', () => {
    const malicious: Article50Report = {
      ...baseReport,
      aiSystems: [
        {
          tool: '<script>alert(1)</script>',
          model: '"&"',
          modelVersion: null,
          sessionCount: 1,
        },
      ],
      attributedFiles: ['<img src=x onerror=alert(1)>'],
    };
    const html = renderArticle50Html(malicious);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('shows empty placeholders for missing data', () => {
    const empty: Article50Report = {
      format: 'aicq-article50/0.1',
      generatedAt: '2026-05-08T12:00:00Z',
      aiSystems: [],
      attributedFiles: [],
    };
    const html = renderArticle50Html(empty, { locale: 'ko' });
    expect(html).toContain('(없음)');
    expect(html.match(/\(없음\)/g)).toHaveLength(2);
  });

  it('includes session count and attributed file paths', () => {
    const html = renderArticle50Html(baseReport);
    expect(html).toContain('claude-code');
    expect(html).toContain('claude-opus-4-7');
    expect(html).toContain('2.1.132');
    expect(html).toContain('src/index.ts');
    expect(html).toContain('src/utils.ts');
    expect(html).toMatch(/<td class="num">3<\/td>/);
  });

  it('renders n/a placeholder when modelVersion is null', () => {
    const html = renderArticle50Html(baseReport, { locale: 'en' });
    expect(html).toContain('n/a');
  });
});

describe('renderArticle50Html — guardrailSummary section (beta.2 Sub 3c)', () => {
  it('omits the guardrail section when guardrailSummary is absent (backward compat)', () => {
    const html = renderArticle50Html(baseReport, { locale: 'en' });
    expect(html).not.toContain('Guardrail violations summary');
    // Existing Korean section title must not appear either.
    expect(html).not.toContain('가드레일 위반 요약');
  });

  it('renders a friendly empty state when totalViolations is 0', () => {
    const report: Article50Report = {
      ...baseReport,
      guardrailSummary: {
        totalViolations: 0,
        filesWithViolations: 0,
        severityCount: { error: 0, warning: 0, info: 0 },
        categoryCount: {},
      },
    };
    const htmlKo = renderArticle50Html(report, { locale: 'ko' });
    expect(htmlKo).toContain('가드레일 위반 요약');
    expect(htmlKo).toContain('(검출된 위반 없음)');
    expect(htmlKo).not.toContain('심각도 분포'); // tables suppressed

    const htmlEn = renderArticle50Html(report, { locale: 'en' });
    expect(htmlEn).toContain('Guardrail violations summary');
    expect(htmlEn).toContain('(no violations detected)');
  });

  it('renders severity and category breakdowns when violations exist (Korean)', () => {
    const report: Article50Report = {
      ...baseReport,
      guardrailSummary: {
        totalViolations: 5,
        filesWithViolations: 3,
        severityCount: { error: 2, warning: 1, info: 2 },
        categoryCount: {
          'no-magic-number': 3,
          'route-needs-auth': 1,
          'no-console-log': 1,
        },
      },
    };
    const html = renderArticle50Html(report, { locale: 'ko' });

    // Section heading + meta
    expect(html).toContain('가드레일 위반 요약');
    expect(html).toContain('총 위반');
    expect(html).toContain('위반 포함 파일');

    // Severity rows (fixed order: error → warning → info)
    expect(html).toContain('심각도 분포');
    expect(html).toContain('오류');
    expect(html).toContain('경고');
    expect(html).toContain('정보');

    // Category breakdown — sorted desc by count → no-magic-number (3) should appear before
    // route-needs-auth (1) or no-console-log (1) in the rendered table.
    const idxNoMagic = html.indexOf('no-magic-number');
    const idxRouteAuth = html.indexOf('route-needs-auth');
    expect(idxNoMagic).toBeGreaterThan(0);
    expect(idxRouteAuth).toBeGreaterThan(0);
    expect(idxNoMagic).toBeLessThan(idxRouteAuth);
  });

  it('renders severity and category breakdowns when violations exist (English)', () => {
    const report: Article50Report = {
      ...baseReport,
      guardrailSummary: {
        totalViolations: 3,
        filesWithViolations: 2,
        severityCount: { error: 1, warning: 0, info: 2 },
        categoryCount: { 'no-magic-number': 2, 'route-needs-auth': 1 },
      },
    };
    const html = renderArticle50Html(report, { locale: 'en' });

    expect(html).toContain('Guardrail violations summary');
    expect(html).toContain('Total violations');
    expect(html).toContain('Files with violations');
    expect(html).toContain('Severity breakdown');
    expect(html).toContain('Rule category breakdown');
    expect(html).toContain('Error');
    expect(html).toContain('Warning');
    expect(html).toContain('Info');
  });

  it('escapes ruleId XSS payloads in the category breakdown', () => {
    const report: Article50Report = {
      ...baseReport,
      guardrailSummary: {
        totalViolations: 1,
        filesWithViolations: 1,
        severityCount: { error: 1, warning: 0, info: 0 },
        categoryCount: { '<script>alert(1)</script>': 1 },
      },
    };
    const html = renderArticle50Html(report, { locale: 'en' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
