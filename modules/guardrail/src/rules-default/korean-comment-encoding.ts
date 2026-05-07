import { defineRule } from '@aicqtools/rule-sdk';

/**
 * Detect mojibake (broken Korean) in comments — typical sign of EUC-KR / CP949
 * source forced through a UTF-8 decoder.
 *
 * Heuristic: looks for runs of `�` or characters in the CJK Compatibility
 * range that are very rare in well-formed Korean comments. False positives
 * possible if the file legitimately uses these chars (e.g. Japanese mixed text).
 *
 * Known limitation: this rule is intentionally heuristic. v1.5 will use a proper
 * encoding detection lib (e.g. chardet) at the file-loader level.
 */
const MOJIBAKE_PATTERN = /[�]{1,}|[㈠-㉃]{2,}|[豈-﫿]{3,}/;

export default defineRule({
  id: 'korean-comment-encoding',
  language: ['typescript', 'javascript', 'tsx', 'python'],
  severity: 'info',
  message: 'Comment contains potential mojibake — file may have encoding issues.',
  messageKo: '주석에 깨진 한글로 보이는 패턴이 있습니다 — 파일 인코딩을 확인하세요.',
  visitors: {
    comment(node, ctx) {
      const text = ctx.textOf(node);
      if (MOJIBAKE_PATTERN.test(text)) ctx.report({ node });
    },
  },
});
