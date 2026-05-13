import { readFile } from 'node:fs/promises';
import fastGlob from 'fast-glob';
import Parser from 'tree-sitter';
import type { Language } from '@aicqtools/core';
import { detectLanguage, loadLanguage, parseSource } from '@aicqtools/core';
import { traverse } from '../matcher/traverse.js';
import { resolveIgnores } from '../runner/run-project.js';
import type { MinePatternsOptions, PatternRuleDraft, SuggestSampleLocation } from './types.js';

const DEFAULT_MIN_COUNT = 5;
const DEFAULT_TOP = 10;
const MAX_FILES = 5000;
const MAX_SAMPLES = 2;
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;

/**
 * Common stdlib / global names whose `new X()` and `X.method()` invocations are universal
 * patterns — they would generate noisy, useless draft rules ("don't construct Map", "don't
 * call JSON.parse"). Dropping them keeps `--patterns` output focused on genuinely
 * project-specific shapes.
 */
const STDLIB_BLOCKLIST = new Set([
  'Array', 'Object', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'Promise', 'RegExp',
  'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'JSON', 'console', 'Math', 'process', 'Buffer', 'Symbol', 'Number', 'String', 'Boolean',
  'Function', 'URL', 'URLSearchParams',
]);

type PatternKind = 'new' | 'call';

interface PatternBucket {
  readonly signature: string;
  readonly language: Language;
  readonly kind: PatternKind;
  readonly parts: readonly string[];
  count: number;
  readonly files: Set<string>;
  readonly samples: SuggestSampleLocation[];
}

interface PatternSignature {
  readonly signature: string;
  readonly kind: PatternKind;
  readonly parts: readonly string[];
}

/**
 * Approach B (early prototype) — mine the AST for frequently-occurring
 * `new X(...)` / `obj.method(...)` shapes and turn the top ones into draft
 * tree-sitter pattern rules. `severity` is conservatively `info` and the
 * `message`/`messageKo` are TODO placeholders — these are seeds a human edits,
 * not finished rules. Every generated query is compiled against the language
 * grammar before it is emitted; ones that don't compile are dropped.
 */
export async function minePatterns(opts: MinePatternsOptions): Promise<PatternRuleDraft[]> {
  const minCount = Math.max(1, opts.minCount ?? DEFAULT_MIN_COUNT);
  const top = Math.max(1, opts.top ?? DEFAULT_TOP);

  const ignore = await resolveIgnores(opts.cwd, opts.exclude, opts.respectGitignore ?? false);
  const files = (
    await fastGlob([...opts.include], {
      cwd: opts.cwd,
      ignore,
      absolute: true,
      onlyFiles: true,
      dot: false,
    })
  ).slice(0, MAX_FILES);

  const buckets = new Map<string, PatternBucket>();

  for (const file of files) {
    const language = detectLanguage(file);
    if (!language) continue;
    let tree: Parser.Tree;
    let source: string;
    try {
      source = await readFile(file, 'utf-8');
      tree = parseSource(language, source);
    } catch {
      continue; // per-file isolation — a broken file must not abort mining
    }
    const textOf = (node: Parser.SyntaxNode): string => source.slice(node.startIndex, node.endIndex);
    try {
      traverse(tree.rootNode, (node) => {
        const sig = extractSignature(node, language, textOf);
        if (!sig) return;
        const key = `${language}::${sig.signature}`;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            signature: sig.signature,
            language,
            kind: sig.kind,
            parts: sig.parts,
            count: 0,
            files: new Set(),
            samples: [],
          };
          buckets.set(key, bucket);
        }
        bucket.count += 1;
        bucket.files.add(file);
        if (bucket.samples.length < MAX_SAMPLES) {
          bucket.samples.push({
            file,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
          });
        }
      });
    } catch {
      continue;
    }
  }

  const candidates = [...buckets.values()]
    .filter((b) => b.count >= minCount)
    .sort((a, b) => b.count - a.count || a.signature.localeCompare(b.signature));

  const drafts: PatternRuleDraft[] = [];
  for (const bucket of candidates) {
    if (drafts.length >= top) break;
    const query = buildQuery(bucket);
    if (!query || !queryCompiles(query, bucket.language)) continue;
    drafts.push(makeDraft(bucket, query));
  }
  return drafts;
}

function extractSignature(
  node: Parser.SyntaxNode,
  language: Language,
  textOf: (n: Parser.SyntaxNode) => string,
): PatternSignature | null {
  if (language === 'python') {
    if (node.type !== 'call') return null;
    const fn = node.childForFieldName('function');
    if (!fn || fn.type !== 'attribute') return null;
    const obj = fn.childForFieldName('object');
    const attr = fn.childForFieldName('attribute');
    if (!obj || obj.type !== 'identifier' || !attr || attr.type !== 'identifier') return null;
    const o = textOf(obj);
    const a = textOf(attr);
    if (!IDENTIFIER_RE.test(o) || !IDENTIFIER_RE.test(a)) return null;
    if (STDLIB_BLOCKLIST.has(o)) return null;
    return { signature: `call:${o}.${a}`, kind: 'call', parts: [o, a] };
  }

  // typescript / tsx / javascript
  if (node.type === 'new_expression') {
    const ctor = node.childForFieldName('constructor');
    if (!ctor || ctor.type !== 'identifier') return null;
    const name = textOf(ctor);
    if (!IDENTIFIER_RE.test(name)) return null;
    if (STDLIB_BLOCKLIST.has(name)) return null;
    return { signature: `new:${name}`, kind: 'new', parts: [name] };
  }
  if (node.type === 'call_expression') {
    const fn = node.childForFieldName('function');
    if (!fn || fn.type !== 'member_expression') return null;
    const obj = fn.childForFieldName('object');
    const prop = fn.childForFieldName('property');
    if (!obj || obj.type !== 'identifier' || !prop || prop.type !== 'property_identifier') return null;
    const o = textOf(obj);
    const p = textOf(prop);
    if (!IDENTIFIER_RE.test(o) || !IDENTIFIER_RE.test(p)) return null;
    if (STDLIB_BLOCKLIST.has(o)) return null;
    return { signature: `call:${o}.${p}`, kind: 'call', parts: [o, p] };
  }
  return null;
}

function buildQuery(bucket: PatternBucket): string | null {
  if (bucket.kind === 'new') {
    const name = bucket.parts[0];
    if (!name) return null;
    return `(new_expression\n  constructor: (identifier) @ctor\n  (#eq? @ctor "${name}"))`;
  }
  const [obj, prop] = bucket.parts;
  if (!obj || !prop) return null;
  if (bucket.language === 'python') {
    return (
      `(call\n` +
      `  function: (attribute\n` +
      `    object: (identifier) @obj\n` +
      `    attribute: (identifier) @attr)\n` +
      `  (#eq? @obj "${obj}")\n` +
      `  (#eq? @attr "${prop}"))`
    );
  }
  return (
    `(call_expression\n` +
    `  function: (member_expression\n` +
    `    object: (identifier) @obj\n` +
    `    property: (property_identifier) @prop)\n` +
    `  (#eq? @obj "${obj}")\n` +
    `  (#eq? @prop "${prop}"))`
  );
}

function queryCompiles(query: string, language: Language): boolean {
  try {
    // eslint-disable-next-line no-new
    new Parser.Query(loadLanguage(language), query);
    return true;
  } catch {
    return false;
  }
}

function makeDraft(bucket: PatternBucket, query: string): PatternRuleDraft {
  const slug = bucket.signature
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filesN = bucket.files.size;
  const fileWord = (n: number, en: boolean): string => (en ? `file${n === 1 ? '' : 's'}` : '개');
  return {
    id: `suggested-${slug}`,
    language: bucket.language,
    severity: 'info',
    message: `TODO: explain why \`${bucket.signature}\` warrants a project rule — auto-suggested, ${bucket.count} occurrences across ${filesN} ${fileWord(filesN, true)}.`,
    messageKo: `TODO: \`${bucket.signature}\` 사용을 프로젝트 룰로 만들 이유를 설명하세요 — 자동 제안, 파일 ${filesN}${fileWord(filesN, false)}에서 ${bucket.count}회.`,
    query,
    meta: { count: bucket.count, files: filesN, sampleLocations: bucket.samples },
  };
}
