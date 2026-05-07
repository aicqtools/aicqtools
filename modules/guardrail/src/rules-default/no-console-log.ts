import { defineRule } from '@aicqtools/rule-sdk';

export default defineRule({
  id: 'no-console-log',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Avoid console.log in production code.',
  messageKo: '운영 코드에서 console.log 사용을 피하세요.',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      const text = ctx.textOf(fn);
      if (text === 'console.log') ctx.report({ node });
    },
  },
});
