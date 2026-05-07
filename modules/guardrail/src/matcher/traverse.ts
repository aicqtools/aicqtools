import type Parser from 'tree-sitter';

export function traverse(
  node: Parser.SyntaxNode,
  visit: (node: Parser.SyntaxNode) => void,
): void {
  visit(node);
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child) traverse(child, visit);
  }
}
