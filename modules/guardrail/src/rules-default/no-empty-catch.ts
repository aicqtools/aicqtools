import { defineRule } from '@aicqtools/rule-sdk';
import { z } from 'zod';

/**
 * Forbids empty catch blocks. At minimum, log or rethrow.
 * Catches the silent-failure anti-pattern that masks bugs.
 *
 * Skip: Capacitor's `native-bridge.{js,ts}` and PWA `service-worker.{js,ts}` regularly
 * swallow exceptions on purpose (the bridge/SW must never crash the host). The rule still
 * fires elsewhere on the same files via other lints.
 *
 * Alpha.15: `SKIP_FILE_RE`'s pattern is promoted to a configurable option
 * (`options.skipFilePatterns`) so users can extend / replace the skip set. The named export
 * is preserved for the alpha.12 meta-vs-code equality guard — `skipPatterns: [SKIP_FILE_RE]`
 * reflects the built-in default only. If the user overrides `skipFilePatterns`, runtime
 * matching diverges from the meta (intentional — `aicq rules suggest` keeps showing defaults).
 */
export const SKIP_FILE_RE = /[/\\](native-bridge|service-worker)\.[jt]sx?$/;

const DEFAULT_SKIP_PATTERNS: readonly string[] = [
  '[/\\\\](native-bridge|service-worker)\\.[jt]sx?$',
] as const;

const optionsSchema = z
  .object({
    skipFilePatterns: z.array(z.string()).default([...DEFAULT_SKIP_PATTERNS]),
  })
  .strict();

interface NoEmptyCatchOptions {
  readonly skipFilePatterns: readonly string[];
}

// Module-scope compile cache — when the same option source array repeats across calls (the
// common case: one `applyRuleConfig` per run), we skip the `new RegExp` cost. Cache invalidates
// when source array reference changes (good enough for the resolve-rule-options call pattern).
let cachedSource: readonly string[] | null = null;
let cachedCompiled: readonly RegExp[] | null = null;

function compileSkipPatterns(source: readonly string[]): readonly RegExp[] {
  if (cachedSource === source && cachedCompiled !== null) return cachedCompiled;
  const compiled = source.map((s) => new RegExp(s));
  cachedSource = source;
  cachedCompiled = compiled;
  return compiled;
}

export default defineRule({
  id: 'no-empty-catch',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'catch block must not be empty — log or rethrow.',
  messageKo: 'catch 블록은 비어 있을 수 없습니다 — log하거나 rethrow하세요.',
  skipPatterns: [SKIP_FILE_RE],
  options: {
    schema: optionsSchema,
    defaults: { skipFilePatterns: [...DEFAULT_SKIP_PATTERNS] },
  },
  visitors: {
    catch_clause(node, ctx) {
      // Alpha.13 escape hatch: `skipBuiltinSkips=true` bypasses BOTH the built-in skip and any
      // user-supplied `skipFilePatterns` (global short-circuit, plan decision #4).
      if (!ctx.skipBuiltinSkips) {
        const opts = (ctx.options as NoEmptyCatchOptions | undefined) ?? {
          skipFilePatterns: DEFAULT_SKIP_PATTERNS,
        };
        const compiled = compileSkipPatterns(opts.skipFilePatterns);
        if (compiled.some((re) => re.test(ctx.filePath))) return;
      }
      const body = node.childForFieldName('body');
      if (!body) return;
      let hasStmt = false;
      for (let i = 0; i < body.namedChildCount; i++) {
        const child = body.namedChild(i);
        if (child && child.type !== 'comment') {
          hasStmt = true;
          break;
        }
      }
      if (!hasStmt) ctx.report({ node });
    },
  },
});
