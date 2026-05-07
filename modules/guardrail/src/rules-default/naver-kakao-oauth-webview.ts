import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Capacitor's `Browser.open()` opens an external Chrome Custom Tab on Android — but
 * Naver/Kakao OAuth callbacks may not return to the in-app session correctly.
 * Best practice (per soanjang's brain rule): use WebView-internal web flow instead.
 *
 * Known limitation: false positives if `Browser.open()` is used for non-OAuth URLs.
 * v1.0 PoC accepts this in exchange for catching the common Capacitor mis-pattern.
 */
const KAKAO_NAVER_PATTERN = /(kakao|naver)/i;

function nthArgText(args: Parser.SyntaxNode, idx: number, textOf: (n: Parser.SyntaxNode) => string): string | null {
  const arg = args.namedChild(idx);
  return arg ? textOf(arg) : null;
}

export default defineRule({
  id: 'naver-kakao-oauth-webview',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Capacitor Browser.open() with Kakao/Naver OAuth URL — use in-WebView web flow for callback continuity.',
  messageKo: 'Capacitor Browser.open()으로 카카오/네이버 OAuth URL — 콜백 연속성을 위해 WebView 내 웹 플로우 권장.',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/naver-kakao-oauth-webview.md',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      // Match `Browser.open(...)` exactly
      if (ctx.textOf(fn) !== 'Browser.open') return;
      const args = node.childForFieldName('arguments');
      if (!args || args.namedChildCount === 0) return;
      // Argument is usually an options object containing { url: '...' }
      const optsText = nthArgText(args, 0, ctx.textOf) ?? '';
      if (KAKAO_NAVER_PATTERN.test(optsText)) ctx.report({ node });
    },
  },
});
