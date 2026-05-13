import { z } from 'zod';

export const localeSchema = z.enum(['ko', 'en']).default('en');

/**
 * Default `exclude` globs.
 *
 * Two principles:
 * 1. Only widely-used framework conventions — never a single project's directory names.
 * 2. Only build artifacts / vendored deps / minified output — NEVER source-adjacent dirs like
 *    `**\/migrations/**`, `**\/seeders/**`, or `**\/database/**`, because rules such as
 *    `camelcase-migration-column` and seeder lints must still see those files.
 */
export const DEFAULT_EXCLUDE: readonly string[] = Object.freeze([
  // Node deps + classic build outputs (carried over from alpha.6)
  '**/node_modules/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/build/**',
  // Framework export & cache dirs (Next, Nuxt, SvelteKit, Astro, Docusaurus, VitePress)
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/.astro/**',
  '**/.docusaurus/**',
  '**/.vitepress/dist/**',
  // Hosting / bundler caches
  '**/.vercel/**',
  '**/.netlify/**',
  '**/.expo/**',
  '**/.cache/**',
  '**/.parcel-cache/**',
  // Test reports, coverage, storybook builds
  '**/coverage/**',
  '**/.nyc_output/**',
  '**/storybook-static/**',
  // Capacitor webDir copies — the mobile native dirs ship a minified copy of the web bundle.
  // (We intentionally do NOT exclude all of ios/** or android/** — only the copied public bundle.)
  '**/ios/App/**/public/**',
  '**/android/app/src/main/assets/public/**',
  '**/android/**/assets/public/**',
  // Python vendored deps & caches
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/.tox/**',
  '**/.mypy_cache/**',
  '**/.pytest_cache/**',
  '**/vendor/**',
  // Minified / pre-bundled output guard (one minified file flips no-magic-number into the thousands)
  '**/*.min.js',
  '**/*.bundle.js',
]);

export const guardrailModuleSchema = z
  .object({
    enabled: z.boolean().default(true),
    rulesDir: z.string().default('aicq/rules'),
    extends: z.array(z.string()).default([]),
    rules: z.record(z.union([z.literal('off'), z.literal('warn'), z.literal('error')])).default({}),
  })
  .default({});

export const provenanceModuleSchema = z
  .object({
    enabled: z.boolean().default(false),
    captureSession: z.boolean().default(true),
    output: z.string().default('aicq/provenance'),
  })
  .default({});

export const supplyChainModuleSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({});

export const aicqConfigSchema = z.object({
  $schema: z.string().optional(),
  locale: localeSchema,
  include: z.array(z.string()).default(['**/*.{ts,tsx,js,mjs,cjs,jsx,py}']),
  exclude: z.array(z.string()).default([...DEFAULT_EXCLUDE]),
  /**
   * When true, the file walker reads the repo-root `.gitignore` and appends its entries to the
   * effective exclude list. Default false to keep behavior deterministic (a project changing
   * `.gitignore` should not silently change what aicqtools scans). Only the root `.gitignore`
   * is honored; nested gitignore files are left for a future release.
   */
  respectGitignore: z.boolean().default(false),
  modules: z
    .object({
      guardrail: guardrailModuleSchema,
      provenance: provenanceModuleSchema,
      supplyChain: supplyChainModuleSchema,
    })
    .default({}),
});

export type AicqConfig = z.infer<typeof aicqConfigSchema>;
