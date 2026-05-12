import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import type { Language } from '../types.js';

export function loadLanguage(lang: Language): Parser.Language {
  switch (lang) {
    case 'typescript':
      return TypeScript.typescript as Parser.Language;
    case 'tsx':
      return TypeScript.tsx as Parser.Language;
    case 'javascript':
      return TypeScript.typescript as Parser.Language;
    case 'python':
      return Python as Parser.Language;
  }
}

// New per-call allocation: tree-sitter@~0.22.4 native binding strict-binds
// Parser ↔ Tree, so reusing one Parser across files would invalidate prior
// trees and make Query.matches throw "SyntaxNode must belong to a Tree".
export function getParser(lang: Language): Parser {
  const parser = new Parser();
  parser.setLanguage(loadLanguage(lang));
  return parser;
}

export function parseSource(lang: Language, source: string): Parser.Tree {
  return getParser(lang).parse(source);
}

export function detectLanguage(filePath: string): Language | null {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.jsx':
      return 'javascript';
    case '.py':
    case '.pyi':
      return 'python';
    default:
      return null;
  }
}
