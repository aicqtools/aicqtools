import type Parser from 'tree-sitter';
import { defineRule } from '@aicqtools/rule-sdk';

/**
 * `no-magic-number` — info-severity rule that flags numeric literals appearing inline in
 * application code (rather than being given a named constant). The hardest part is choosing
 * a defensible default for "what's NOT a magic number." This rule errs on the side of fewer
 * false positives because it ships at `info` severity and historically dominates noise budgets.
 *
 * Skipped contexts (all heuristic; project-specific tuning belongs in a future per-rule
 * options seam):
 * - Test fixture / spec files (filename heuristic)
 * - `*.config.{ts,tsx,js,jsx}`, `*.polyfill.{ts,tsx,js,jsx}`, `**\/polyfills/**` (filename)
 * - Variable declarator RHS (`const X = 7;` — 7 is being NAMED, not used inline)
 * - JSX attribute values (`<View width={24} />`)
 * - Enum members (`enum E { A = 7 }`)
 * - Array index subscripts (`arr[42]`)
 * - `for` loop initializer/condition/update
 * - Arguments to obvious numeric APIs (`parseInt(s, 16)`, `Math.*`, `Number(...)`, `.toFixed(2)`,
 *   `.padStart(8, '0')`, `setTimeout(f, 100)`, `setInterval(f, 1000)`)
 * - "Timeout-ish" variable-name contexts (carried over from alpha.6)
 *
 * Allowed-numbers default extended to common-sense values: powers of two, common bases,
 * time/clock constants, etc.
 */
const ALLOWED_NUMBERS = new Set([
  '0', '1', '-1', '2', '-2', '10', '16', '24', '60', '100', '1000', '1024',
]);

const SKIP_FILE_RE = /(\.test\.|\.spec\.|__tests__|fixtures|\.config\.|\.polyfill\.|[/\\]polyfills[/\\])/;

// Callee names whose numeric args are almost always intentional, not magic numbers.
// Matched on the leaf identifier (last name segment) — covers both `parseInt(...)` and
// `Number.parseInt(...)` / `globalThis.setTimeout(...)`.
const NUMERIC_API_CALLEES = new Set([
  'parseInt', 'parseFloat', 'Number',
  'setTimeout', 'setInterval', 'setImmediate',
  'toFixed', 'toPrecision', 'toExponential', 'toString',
  'padStart', 'padEnd', 'repeat', 'slice', 'substr', 'substring', 'charAt', 'codePointAt',
  'round', 'floor', 'ceil', 'trunc', 'abs', 'sign', 'min', 'max', 'pow', 'log',
]);

function isInSkippedFile(filePath: string): boolean {
  return SKIP_FILE_RE.test(filePath);
}

function isInTimeoutMsContext(node: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  // Allow magic numbers in obvious time/duration contexts where the unit is in the variable name.
  let parent = node.parent;
  while (parent) {
    const text = textOf(parent);
    if (/timeout|interval|duration|delay|ms|sec|hour|day/i.test(text.slice(0, 40))) return true;
    if (parent.type === 'function_declaration' || parent.type === 'method_definition') break;
    parent = parent.parent;
  }
  return false;
}

const SKIP_ANCESTOR_TYPES = new Set([
  // Variable declarator: `const RETRY = 5;` — the literal IS the named constant we want.
  'variable_declarator',
  // Enum members: `enum E { A = 7 }`
  'enum_body',
  'enum_assignment',
  // JSX attribute values: `<View width={24} />`
  'jsx_attribute',
  'jsx_expression',
  // Array index subscripts: `arr[42]`
  'subscript_expression',
  // For loop header: `for (let i = 0; i < 5; i++) {}`
  'for_statement',
  'for_in_statement',
  'for_of_statement',
]);

function hasSkippableAncestor(node: Parser.SyntaxNode): boolean {
  let parent: Parser.SyntaxNode | null = node.parent;
  let depth = 0;
  while (parent && depth < 8) {
    if (SKIP_ANCESTOR_TYPES.has(parent.type)) return true;
    // Stop at clear statement / function boundaries so a number deep in a function body
    // doesn't get silently allowed by a far-away for-loop ancestor.
    if (
      parent.type === 'statement_block' ||
      parent.type === 'function_declaration' ||
      parent.type === 'method_definition' ||
      parent.type === 'arrow_function' ||
      parent.type === 'function_expression'
    ) {
      return false;
    }
    parent = parent.parent;
    depth += 1;
  }
  return false;
}

/**
 * Returns true if the number is a positional argument to a call expression whose final
 * identifier is a known numeric API (parseInt, parseFloat, Math.*, .toFixed, …).
 */
function isArgOfNumericApi(node: Parser.SyntaxNode, textOf: (n: Parser.SyntaxNode) => string): boolean {
  const parent = node.parent;
  if (!parent || parent.type !== 'arguments') return false;
  const callExpr = parent.parent;
  if (!callExpr || callExpr.type !== 'call_expression') return false;
  const fn = callExpr.childForFieldName('function');
  if (!fn) return false;
  // Pull out the *final* name segment whether the callee is `foo` or `Obj.foo` or `a.b.foo`.
  let nameNode: Parser.SyntaxNode | null = fn;
  while (nameNode && (nameNode.type === 'member_expression' || nameNode.type === 'parenthesized_expression')) {
    const fromField: Parser.SyntaxNode | null = nameNode.childForFieldName('property');
    const fallback: Parser.SyntaxNode | undefined = nameNode.namedChildren[nameNode.namedChildren.length - 1];
    const prop: Parser.SyntaxNode | null = fromField ?? fallback ?? null;
    if (!prop || prop === nameNode) break;
    nameNode = prop;
  }
  if (!nameNode) return false;
  const name = textOf(nameNode);
  return NUMERIC_API_CALLEES.has(name);
}

export default defineRule({
  id: 'no-magic-number',
  language: ['typescript', 'javascript', 'tsx'],
  severity: 'info',
  message: 'Magic number — extract to a named constant for clarity.',
  messageKo: '매직 넘버 — 명명된 상수로 추출해 의미를 명확히 하세요.',
  visitors: {
    number(node, ctx) {
      if (isInSkippedFile(ctx.filePath)) return;
      const text = ctx.textOf(node);
      if (ALLOWED_NUMBERS.has(text)) return;
      if (hasSkippableAncestor(node)) return;
      if (isArgOfNumericApi(node, ctx.textOf)) return;
      if (isInTimeoutMsContext(node, ctx.textOf)) return;
      ctx.report({ node });
    },
  },
});
