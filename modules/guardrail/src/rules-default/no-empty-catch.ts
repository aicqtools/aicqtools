import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Forbids empty catch blocks. At minimum, log or rethrow.
 * Catches the silent-failure anti-pattern that masks bugs.
 *
 * Skip: Capacitor's `native-bridge.{js,ts}` and PWA `service-worker.{js,ts}` regularly
 * swallow exceptions on purpose (the bridge/SW must never crash the host). The rule still
 * fires elsewhere on the same files via other lints.
 */
export const SKIP_FILE_RE = /[/\\](native-bridge|service-worker)\.[jt]sx?$/;

export default defineRule({
  id: 'no-empty-catch',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'catch block must not be empty — log or rethrow.',
  messageKo: 'catch 블록은 비어 있을 수 없습니다 — log하거나 rethrow하세요.',
  skipPatterns: [SKIP_FILE_RE],
  visitors: {
    catch_clause(node, ctx) {
      if (SKIP_FILE_RE.test(ctx.filePath)) return;
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
