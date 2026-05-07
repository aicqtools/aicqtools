import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Detect string literals like `"5000원"` or `"50000원"` (≥4 digits) without a thousands
 * separator. UX best practice in Korea: always show ₩ amounts as `5,000원`.
 *
 * Known limitation: doesn't catch programmatically-formatted amounts (template literals
 * with computed values are intentionally skipped to avoid false positives).
 */
const WON_NUMBER_PATTERN = /["'`](\d{4,})원["'`]/;

export default defineRule({
  id: 'won-format-thousands',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Won amount should use thousands separator: `5,000원` instead of `5000원`.',
  messageKo: '원화 금액은 천단위 콤마 권장: `5000원` → `5,000원`.',
  visitors: {
    string(node, ctx) {
      const text = ctx.textOf(node);
      if (WON_NUMBER_PATTERN.test(text)) ctx.report({ node });
    },
  },
});
