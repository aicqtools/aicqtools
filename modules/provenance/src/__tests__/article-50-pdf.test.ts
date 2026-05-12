import { describe, expect, it } from 'vitest';
import { loadPuppeteer, renderArticle50Pdf } from '../reporter/article-50-pdf.js';
import type { Article50Report } from '../reporter/article-50.js';

const sampleReport: Article50Report = {
  format: 'aicq-article50/0.1',
  generatedAt: '2026-05-08T12:00:00Z',
  aiSystems: [
    { tool: 'claude-code', model: 'claude-opus-4-7', modelVersion: '2.1.132', sessionCount: 1 },
  ],
  attributedFiles: ['src/index.ts'],
};

let puppeteerModuleAvailable = false;
let chromeRunnable = false;
try {
  const p = await loadPuppeteer();
  puppeteerModuleAvailable = true;
  try {
    const browser = await p.launch({ headless: true });
    await browser.close();
    chromeRunnable = true;
  } catch {
    chromeRunnable = false;
  }
} catch {
  puppeteerModuleAvailable = false;
}

describe('renderArticle50Pdf', () => {
  it.skipIf(puppeteerModuleAvailable)(
    'throws a friendly error when puppeteer is not installed',
    async () => {
      await expect(renderArticle50Pdf(sampleReport)).rejects.toThrow(/puppeteer is required/);
    },
  );

  it.skipIf(!chromeRunnable)(
    'returns a non-empty PDF buffer when puppeteer + Chrome are installed',
    async () => {
      const pdf = await renderArticle50Pdf(sampleReport, { locale: 'ko' });
      expect(pdf).toBeInstanceOf(Uint8Array);
      expect(pdf.length).toBeGreaterThan(1000);
      // PDF magic bytes %PDF
      expect(pdf[0]).toBe(0x25);
      expect(pdf[1]).toBe(0x50);
      expect(pdf[2]).toBe(0x44);
      expect(pdf[3]).toBe(0x46);
    },
    30_000,
  );
});

describe('loadPuppeteer', () => {
  it.skipIf(!puppeteerModuleAvailable)(
    'exposes a launch function when puppeteer is installed',
    async () => {
      const p = await loadPuppeteer();
      expect(typeof p.launch).toBe('function');
    },
  );
});
