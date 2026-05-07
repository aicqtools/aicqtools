import { defineRule } from '@aicqtools/rule-sdk';

/**
 * `Content-Disposition: attachment; filename="<korean>.csv"` without RFC 5987 encoding
 * breaks Korean filenames in older browsers (esp. IE11/old Safari). Use
 * `filename*=UTF-8''<encoded>` form.
 *
 * Heuristic: inspect whole call expressions (e.g. `setHeader("Content-Disposition", "...")`)
 * so multi-arg patterns where the header name and value live in separate strings are caught.
 */
const HAS_KOREAN = /[ㄱ-힝]/;
const HAS_RFC5987 = /filename\*\s*=\s*UTF-8''/i;
const HAS_CONTENT_DISPOSITION = /Content-Disposition/i;

export default defineRule({
  id: 'rfc5987-korean-filename',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Content-Disposition with Korean filename should use RFC 5987 (`filename*=UTF-8\'\'...`).',
  messageKo: '한글 파일명 Content-Disposition은 RFC 5987 인코딩 필요 (`filename*=UTF-8\'\'...`).',
  visitors: {
    call_expression(node, ctx) {
      const text = ctx.textOf(node);
      if (!HAS_CONTENT_DISPOSITION.test(text)) return;
      if (!HAS_KOREAN.test(text)) return;
      if (HAS_RFC5987.test(text)) return;
      ctx.report({ node });
    },
  },
});
