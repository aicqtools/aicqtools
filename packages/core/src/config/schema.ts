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
  // Precise public/ build-output paths (alpha.9). We keep `**/public/**` itself live because
  // hand-written assets (e.g. Capacitor's `public/native-bridge.js`) belong there. Drop only the
  // narrowly named build subdirs that frameworks emit copies into.
  '**/public/_next/**',
  '**/public/static/**',
  '**/public/build/**',
  // Minified / pre-bundled output guard (one minified file flips no-magic-number into the thousands)
  '**/*.min.js',
  '**/*.bundle.js',
]);

const ruleLevelSchema = z.union([z.literal('off'), z.literal('warn'), z.literal('error')]);

/**
 * Alpha.14 — per-rule options framework. Each entry in `rules` / `overrides[].rules` can be
 * either the legacy string shape (`'off' | 'warn' | 'error'`) **or** an object with
 * `severity` (optional, defaults to the rule's declared severity) and `options` (optional,
 * a record validated against the rule's own zod schema). `.strict()` means typos in the
 * top-level keys (`severityy`, `option`) are caught by the schema parser; typos inside
 * `options` are surfaced as `cli.check.unknownRuleOptionKey` stderr warnings at run time.
 *
 * Back-compat: omitting the object shape entirely preserves alpha.7~13 parsing — existing
 * `rules: { foo: 'off' }` configs go through the union's first branch unchanged.
 */
const ruleConfigObjectSchema = z
  .object({
    severity: ruleLevelSchema.optional(),
    options: z.record(z.unknown()).optional(),
  })
  .strict();

const ruleEntrySchema = z.union([ruleLevelSchema, ruleConfigObjectSchema]);

export type RuleLevel = z.infer<typeof ruleLevelSchema>;
export type RuleConfigObject = z.infer<typeof ruleConfigObjectSchema>;
export type RuleEntry = z.infer<typeof ruleEntrySchema>;

/**
 * Per-path rule overrides (alpha.8). Behaves like ESLint's `overrides`: each entry matches a list
 * of micromatch globs against the file path and applies its `rules` map on top of the global one.
 * Multiple matching entries are merged in declaration order — later entries win for the same rule.
 * `off` drops the rule for that file; `warn`/`error` overrides its severity. Unknown rule ids are
 * collected and reported via stderr once, so config typos surface early instead of silently no-op'ing.
 *
 * Alpha.10: `paths` globs are auto-anchored — a leading `**\/` is prepended unless one is already
 * present, so `scripts/**` and `**\/scripts/**` behave identically. To opt out (anchor to the
 * repo root or an absolute path), lead the glob with `/`, `<drive>:/`, or write `**` yourself.
 * After the scan, any entry whose globs matched zero files emits a per-entry stderr warning.
 *
 * Alpha.14: `rules` map values accept the object shape `{ severity?, options? }` alongside the
 * legacy `'off'|'warn'|'error'` strings (see `ruleEntrySchema`).
 */
export const ruleOverrideSchema = z.object({
  paths: z.array(z.string().min(1)).min(1),
  rules: z.record(ruleEntrySchema).default({}),
});

export type RuleOverride = z.infer<typeof ruleOverrideSchema>;

export const guardrailModuleSchema = z
  .object({
    enabled: z.boolean().default(true),
    rulesDir: z.string().default('aicq/rules'),
    extends: z.array(z.string()).default([]),
    rules: z.record(ruleEntrySchema).default({}),
    overrides: z.array(ruleOverrideSchema).default([]),
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
   * Controls whether the file walker appends entries from the repo-root `.gitignore` to the
   * effective exclude list (alpha.9). Three values:
   *
   * - `'auto'` (default): enabled when a `.gitignore` is present at the repo root, otherwise
   *   disabled. This is the friendly default for the common case where a developer's git-ignored
   *   directories are exactly the noise they don't want aicqtools to scan.
   * - `true`: force-enable (legacy boolean opt-in).
   * - `false`: force-disable (legacy boolean opt-out).
   *
   * CLI flags `--gitignore` / `--no-gitignore` override config for a single run.
   *
   * Only the root `.gitignore` is honored; nested gitignore files are left for a future release.
   */
  respectGitignore: z.union([z.boolean(), z.literal('auto')]).default('auto'),
  /**
   * Escape hatch (alpha.13) — when `true`, built-in `SKIP_FILE_RE` guards inside default rules
   * (`no-console-log` / `no-empty-catch` / `no-magic-number`) are bypassed so those rules fire
   * on the conventionally-skipped paths (`scripts/`, `native-bridge.js`, `__tests__/`, …).
   * Default `false` preserves alpha.10~12 behavior. The skip metadata exposed by
   * `aicq rules suggest` (alpha.12) is unaffected — only the runtime guard is toggled.
   * Per-rule toggling is left for the v1.0 per-rule options framework.
   */
  skipBuiltinSkips: z.boolean().default(false),
  /**
   * Alpha.17 opt-in — when `true`, `aicq check` emits an info-severity `@aicq/unused-suppression`
   * diagnostic for every `aicq-disable-*` directive that matched zero violations during the run.
   * Mirrors ESLint's `--report-unused-disable-directives` pattern: default `false` so dogfood
   * counts don't grow unexpectedly; users opt in once they want to clean stale suppressions.
   *
   * The synthetic diagnostic id `@aicq/unused-suppression` lives outside the `rules:` map (no
   * `Rule` object backs it), so the only way to turn it off is to flip this flag back to false
   * (or pass CLI `--no-report-unused-suppressions`). CLI flag wins over config when set.
   */
  reportUnusedSuppressions: z.boolean().default(false),
  modules: z
    .object({
      guardrail: guardrailModuleSchema,
      provenance: provenanceModuleSchema,
      supplyChain: supplyChainModuleSchema,
    })
    .default({}),
});

export type AicqConfig = z.infer<typeof aicqConfigSchema>;
