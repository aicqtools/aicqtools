import { defineRule } from '@aicqtools/rule-sdk';
import { z } from 'zod';

/**
 * Skip build/utility script directories where `console.log` is the intended I/O channel
 * (`scripts/`, `tools/`, `bin/` — same convention as alpha.8's `seeders/`+`migrations/`
 * skip for `no-magic-number`). The rule continues to fire in application source.
 */
export const SKIP_FILE_RE = /[/\\](scripts|tools|bin)[/\\]/;

/**
 * Default detection set — alpha.13 behavior was "flag `console.log` only". Alpha.15 promotes
 * this to a configurable allowlist via `options.flagMethods` so users can extend detection to
 * `console.debug`, `console.warn`, etc. (or shrink to `[]` for an intentional mute).
 */
const DEFAULT_FLAG_METHODS: readonly string[] = ['log'] as const;

const optionsSchema = z
  .object({
    flagMethods: z.array(z.string()).default([...DEFAULT_FLAG_METHODS]),
  })
  .strict();

interface NoConsoleLogOptions {
  readonly flagMethods: readonly string[];
}

export default defineRule({
  id: 'no-console-log',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Avoid console.log in production code.',
  messageKo: '운영 코드에서 console.log 사용을 피하세요.',
  skipPatterns: [SKIP_FILE_RE],
  options: {
    schema: optionsSchema,
    defaults: { flagMethods: [...DEFAULT_FLAG_METHODS] },
  },
  visitors: {
    call_expression(node, ctx) {
      if (!ctx.skipBuiltinSkips && SKIP_FILE_RE.test(ctx.filePath)) return;
      const fn = node.childForFieldName('function');
      if (!fn) return;
      const text = ctx.textOf(fn);
      const opts = (ctx.options as NoConsoleLogOptions | undefined) ?? {
        flagMethods: DEFAULT_FLAG_METHODS,
      };
      const flagged = new Set(opts.flagMethods.map((m) => 'console.' + m));
      if (flagged.has(text)) ctx.report({ node });
    },
  },
});
