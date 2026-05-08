import type { Article50Report } from './article-50.js';
import { renderArticle50Html, type RenderHtmlOptions } from './article-50-html.js';

export interface RenderPdfOptions extends RenderHtmlOptions {
  readonly format?: 'A4' | 'Letter';
  readonly margin?: {
    readonly top?: string;
    readonly right?: string;
    readonly bottom?: string;
    readonly left?: string;
  };
}

interface PuppeteerPage {
  setContent(html: string, opts?: { waitUntil?: string }): Promise<void>;
  pdf(opts?: unknown): Promise<Uint8Array>;
}
interface PuppeteerBrowser {
  newPage(): Promise<PuppeteerPage>;
  close(): Promise<void>;
}
interface PuppeteerModule {
  launch(opts?: unknown): Promise<PuppeteerBrowser>;
}

export async function loadPuppeteer(): Promise<PuppeteerModule> {
  try {
    // @ts-expect-error — puppeteer is an optional peer dependency, may be unresolved at type-check time
    const mod = await import('puppeteer');
    return (mod.default ?? mod) as PuppeteerModule;
  } catch {
    throw new Error(
      'puppeteer is required for PDF rendering but is not installed.\n' +
        'Install it as a peer dependency: `pnpm add puppeteer` (or `npm install puppeteer`).\n' +
        'See docs/pdf-rendering.md for details.',
    );
  }
}

export async function renderArticle50Pdf(
  report: Article50Report,
  opts: RenderPdfOptions = {},
): Promise<Uint8Array> {
  const html = renderArticle50Html(report, opts);
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: opts.format ?? 'A4',
      printBackground: true,
      margin: opts.margin ?? {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
  } finally {
    await browser.close();
  }
}
