/**
 * Demo user rule for the talkup-mirror dogfooding project.
 * Forbids any direct call to `foo()`.
 *
 * Authored as plain ESM so no build step is required for v1.0 PoC.
 * (TS user rules will be supported via tsx/esbuild loader in v1.0 final.)
 */
export default {
  kind: 'function',
  id: 'no-foo',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'warning',
  message: 'Avoid foo() calls in this codebase.',
  messageKo: '이 코드베이스에서 foo() 호출은 금지됩니다.',
  visitors: {
    call_expression(node, ctx) {
      const fn = node.childForFieldName('function');
      if (!fn) return;
      if (ctx.textOf(fn) === 'foo') {
        ctx.report({ node });
      }
    },
  },
};
