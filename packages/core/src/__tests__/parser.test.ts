import { describe, it, expect } from 'vitest';
import { detectLanguage, parseSource } from '../parser/tree-sitter.js';

describe('detectLanguage', () => {
  it('detects TypeScript from .ts', () => {
    expect(detectLanguage('foo/bar.ts')).toBe('typescript');
  });
  it('detects TSX from .tsx', () => {
    expect(detectLanguage('foo/bar.tsx')).toBe('tsx');
  });
  it('detects JavaScript from .js/.mjs/.cjs', () => {
    expect(detectLanguage('a.js')).toBe('javascript');
    expect(detectLanguage('a.mjs')).toBe('javascript');
    expect(detectLanguage('a.cjs')).toBe('javascript');
  });
  it('detects Python from .py', () => {
    expect(detectLanguage('foo/bar.py')).toBe('python');
  });
  it('returns null for unknown', () => {
    expect(detectLanguage('foo/bar.txt')).toBeNull();
  });
});

describe('parseSource', () => {
  it('parses TypeScript without syntax errors', () => {
    const tree = parseSource('typescript', 'const x: number = 1;');
    expect(tree.rootNode.hasError).toBe(false);
  });

  it('parses Python without syntax errors', () => {
    const tree = parseSource('python', 'x = 1\n');
    expect(tree.rootNode.hasError).toBe(false);
  });

  it('detects TypeScript syntax errors', () => {
    const tree = parseSource('typescript', 'const x: = ;');
    expect(tree.rootNode.hasError).toBe(true);
  });
});

// Regression guard for the tree-sitter@~0.22.4 "SyntaxNode must belong to a Tree"
// crash that surfaced in alpha.3 (329 occurrences on the TalkUp scan). The cache
// was reusing one Parser per language across files; the native binding strict-binds
// Parser ↔ Tree, so prior trees became invalid after subsequent parses. Fixed in
// alpha.4 by removing parserCache.
describe('parseSource — multi-file reuse', () => {
  it('parses many sources for the same language without cross-tree node invalidation', () => {
    const sources = [
      'const a = 1;\n',
      'const b: number = 2;\n',
      'function f(x: string) { return x; }\n',
      'class C { m() { return 1; } }\n',
    ];
    const trees = sources.map((s) => parseSource('typescript', s));
    for (const t of trees) {
      expect(t.rootNode.type).toBe('program');
      expect(t.rootNode.hasError).toBe(false);
      expect(t.rootNode.firstChild).not.toBeNull();
    }
  });
});

// Regression guard for the tree-sitter@0.21.1 native-binding bug that rejected
// inputs ≥ 32,768 bytes with "Invalid argument" (TalkUp alpha.2 blocker).
// Fixed by upgrading to tree-sitter@~0.22.4 in alpha.3.
describe('parseSource — large inputs', () => {
  function makeTs(bytes: number) {
    const unit = 'const a = 1;\n';
    return unit.repeat(Math.ceil(bytes / unit.length));
  }
  function makePy(bytes: number) {
    const unit = 'x = 1\n';
    return unit.repeat(Math.ceil(bytes / unit.length));
  }
  for (const lang of ['typescript', 'tsx', 'javascript'] as const) {
    for (const bytes of [32_768, 51_200, 102_400]) {
      it(`parses ${bytes}-byte ${lang} without throwing`, () => {
        const tree = parseSource(lang, makeTs(bytes));
        expect(tree.rootNode.type).toBe('program');
        expect(tree.rootNode.hasError).toBe(false);
      });
    }
  }
  for (const bytes of [32_768, 51_200, 102_400]) {
    it(`parses ${bytes}-byte python without throwing`, () => {
      const tree = parseSource('python', makePy(bytes));
      expect(tree.rootNode.type).toBe('module');
      expect(tree.rootNode.hasError).toBe(false);
    });
  }
});
