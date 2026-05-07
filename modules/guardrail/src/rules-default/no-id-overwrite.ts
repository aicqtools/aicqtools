import { defineRule } from '@aicq/rule-sdk';

/**
 * Forbid assignment to `<obj>.id`. IDs should be immutable after creation.
 * Catches the TalkUp class of bugs where conv_* IDs get overwritten with resp_*.
 */
export default defineRule({
  id: 'no-id-overwrite',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'error',
  message: 'Do not reassign `.id`. IDs are immutable after creation.',
  messageKo: '`.id` 필드는 생성 후 재할당하지 마세요. ID는 불변이어야 합니다.',
  visitors: {
    assignment_expression(node, ctx) {
      const left = node.childForFieldName('left');
      if (!left || left.type !== 'member_expression') return;
      const property = left.childForFieldName('property');
      if (!property) return;
      if (ctx.textOf(property) === 'id') {
        ctx.report({ node });
      }
    },
  },
});
