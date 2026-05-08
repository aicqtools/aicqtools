# PDF rendering for Article 50 reports

`aicq provenance report --format article-50-pdf` renders the EU AI Act Article 50 transparency report as a print-ready PDF. The renderer reuses the HTML template (Korean / English bilingual, system-font fallback chain) and pipes it through a real browser engine for pixel-perfect output.

## Requirements

PDF rendering is **opt-in** — `puppeteer` is declared as an optional peer dependency, so a default `pnpm install` of aicqtools does not download Chromium. Install it only when you need the PDF format:

```bash
# pnpm
pnpm add puppeteer

# npm
npm install puppeteer
```

Puppeteer downloads a matching Chromium build (~200 MB) on install. If you already have a system Chromium / Chrome and want to reuse it instead, set `PUPPETEER_SKIP_DOWNLOAD=true` before installing and configure `PUPPETEER_EXECUTABLE_PATH` at runtime.

## Usage

Capture provenance, then render the PDF report:

```bash
# 1. capture
aicq provenance capture --reader all --output aicq/provenance/today.json

# 2. render PDF (Korean locale)
aicq provenance report aicq/provenance/today.json \
  --format article-50-pdf \
  --locale ko \
  --output aicq/reports/article-50-2026-05-08.pdf
```

`--output <path>` is **required** for the PDF format (binary output is not piped through stdout).

## Layout

- A4 by default, printable margins (`20mm` all sides).
- Korean text uses the system fallback chain (`Malgun Gothic` on Windows, `Apple SD Gothic Neo` on macOS, `Noto Sans CJK KR` on Linux). Chromium picks the first available font.
- Print-friendly CSS: page-break suggestions on section headers and table boundaries.

## Programmatic API

```ts
import { renderArticle50Pdf, buildArticle50Report } from '@aicqtools/provenance';

const report = buildArticle50Report(record);
const pdf = await renderArticle50Pdf(report, {
  locale: 'ko',
  format: 'A4',
  margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '20mm' },
});
await fs.writeFile('out.pdf', pdf);
```

If puppeteer is not installed, the function throws a clear error pointing back to this guide.

## Troubleshooting

- **"puppeteer is required ..."** — install puppeteer (see above).
- **Korean glyphs render as boxes** — install one of the fallback fonts on your system, or configure puppeteer with `args: ['--font-render-hinting=none']` and a known font.
- **Chromium download fails behind a proxy** — set `HTTPS_PROXY` before `pnpm add puppeteer`, or use `PUPPETEER_SKIP_DOWNLOAD=true` plus a system Chromium binary.
- **Headless deprecation warning** — newer puppeteer versions accept `headless: 'new'` (used by aicqtools). Older versions may print a deprecation; upgrade to `puppeteer >= 22`.

## Why an optional dependency?

EU AI Act § 50 requires machine-readable transparency disclosure. JSON (default) and HTML (`--format article-50-html`) already satisfy that requirement. PDF is an audit-friendly *bonus* for human reviewers. Forcing every aicqtools user to download ~200 MB of Chromium would penalize the 95 % who only need JSON / HTML — so we keep the dependency optional.
