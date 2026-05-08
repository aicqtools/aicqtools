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
