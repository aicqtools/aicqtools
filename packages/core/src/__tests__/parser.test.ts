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
