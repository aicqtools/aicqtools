import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Detect EUC-KR / CP949 / non-UTF-8 file encoding by checking the first few bytes of the source.
 * UTF-8 BOM is acceptable (some Windows tools add it).
 *
 * Heuristic limitation: tree-sitter has already decoded the source as UTF-8, so we look for
 * `replacement character (U+FFFD)` patterns which appear when invalid UTF-8 was decoded loosely.
 */
export default defineRule({
  id: 'enforce-utf8-encoding',
  language: ['typescript', 'javascript', 'tsx', 'python'],
  severity: 'error',
  message: 'File appears to use non-UTF-8 encoding (replacement chars detected) — re-save as UTF-8.',
  messageKo: '파일이 UTF-8 외 인코딩으로 보입니다 (U+FFFD 검출) — UTF-8로 재저장하세요.',
  visitors: {
    program(node, ctx) {
      // Heuristic: if source contains the Unicode replacement char, decoding likely failed.
      if (ctx.source.includes('�')) ctx.report({ node });
    },
    module(node, ctx) {
      // Python's root node is "module", TS's is "program"
      if (ctx.source.includes('�')) ctx.report({ node });
    },
  },
});
