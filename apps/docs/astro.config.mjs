import { defineConfig } from 'astro/config';

// https://docs.astro.build/en/guides/internationalization/
export default defineConfig({
  site: 'https://aicqtools.dev',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  // Phase 1a PoC: static output. v1.5 considers SSR for dashboard.
  output: 'static',
});
