import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
import type { Language } from '../types.js';

const parserCache = new Map<Language, Parser>();

function loadLanguage(lang: Language): Parser.Language {
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

export function getParser(lang: Language): Parser {
  let parser = parserCache.get(lang);
  if (!parser) {
    parser = new Parser();
    parser.setLanguage(loadLanguage(lang));
    parserCache.set(lang, parser);
  }
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
