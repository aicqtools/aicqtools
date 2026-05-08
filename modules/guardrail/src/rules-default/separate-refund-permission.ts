import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';
import type { RuleContext } from '@aicqtools/rule-sdk';

/**
 * Refund operations are highly privileged — separation of duties requires
 * a permission check before invoking any refund logic. Detect functions
 * named `refund*` whose body lacks a permission/role check.
 */
const REFUND_NAME = /^(refund|cancelRefund|issueRefund|refund\w*)$/;
const PERMISSION_CHECK = /\b(req\.user\.role|hasPermission|checkPermission|isAdmin|requireRole|allowedRoles|authGuard|RBAC|canRefund|verifyPermission)\b/i;

function check(node: Parser.SyntaxNode, ctx: RuleContext): void {
  const name = node.childForFieldName('name');
  if (!name) return;
  const fnName = ctx.textOf(name);
  if (!REFUND_NAME.test(fnName)) return;
  const text = ctx.textOf(node);
  if (PERMISSION_CHECK.test(text)) return;
  ctx.report({ node });
}

export default defineRule({
  id: 'separate-refund-permission',
  language: ['typescript', 'tsx'],
  severity: 'error',
  message: 'Refund function lacks a permission/role check (PCI DSS § 7.2 — restrict access by business need-to-know; separation of duties).',
  messageKo: '환불 함수에 권한 체크가 없습니다 (PCI DSS § 7.2 — 업무 필요에 따른 접근 제한; 직무 분리 원칙).',
  docs: 'https://github.com/aicqtools/aicqtools/blob/main/docs/rules/separate-refund-permission.md',
  visitors: {
    function_declaration: check,
    method_definition: check,
  },
});
