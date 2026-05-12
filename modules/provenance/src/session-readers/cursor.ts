import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, posix, win32 } from 'node:path';
import type { AiPromptRecord, AiSession } from '../types.js';
import type { SessionReader, SessionReaderResult } from './types.js';

export interface CursorReaderOptions {
  readonly home?: string;
  readonly platformOverride?: NodeJS.Platform;
  readonly appDataOverride?: string;
  readonly maxWorkspaces?: number;
  readonly maxDatabases?: number;
}

/** ItemTable keys that hold Cursor AI-chat payloads, newest-Cursor-first. */
const CURSOR_CHAT_KEYS = [
  'workbench.panel.aichat.view.aichat.chatdata',
  'aiService.prompts',
  'composer.composerData',
  'workbench.panel.composerChatViewPane.composer.composerData',
] as const;

const MAX_PROMPTS_PER_DB = 500;
const MAX_COMPOSER_ROWS = 200;
const MAX_BUBBLE_ROWS = 1000;

export function getCursorWorkspaceStorageDir(opts: {
  home: string;
  platform: NodeJS.Platform;
  appData?: string;
}): string | null {
  if (opts.platform === 'win32') {
    if (!opts.appData) return null;
    return win32.join(opts.appData, 'Cursor', 'User', 'workspaceStorage');
  }
  if (opts.platform === 'darwin') {
    return posix.join(opts.home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');
  }
  return posix.join(opts.home, '.config', 'Cursor', 'User', 'workspaceStorage');
}

export function getCursorGlobalStorageDir(opts: {
  home: string;
  platform: NodeJS.Platform;
  appData?: string;
}): string | null {
  if (opts.platform === 'win32') {
    if (!opts.appData) return null;
    return win32.join(opts.appData, 'Cursor', 'User', 'globalStorage');
  }
  if (opts.platform === 'darwin') {
    return posix.join(opts.home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage');
  }
  return posix.join(opts.home, '.config', 'Cursor', 'User', 'globalStorage');
}

interface VscdbCandidate {
  readonly path: string;
  readonly mtimeMs: number;
}

/**
 * Reads Cursor AI-chat history from `state.vscdb` (SQLite) — workspace storage
 * (`ItemTable`) and global storage (`ItemTable` + `cursorDiskKV`). Best-effort:
 * Cursor's schema shifts between versions, so unrecognized/changed shapes degrade
 * to detection-only (a single `cursor-detected-*` session, no prompts) and the
 * reader never throws (per-file isolation policy).
 */
export class CursorSessionReader implements SessionReader {
  readonly id = 'cursor';
  private readonly home: string;
  private readonly platform: NodeJS.Platform;
  private readonly appData: string | undefined;
  private readonly maxWorkspaces: number;
  private readonly maxDatabases: number;

  constructor(opts: CursorReaderOptions = {}) {
    this.home = opts.home ?? homedir();
    this.platform = opts.platformOverride ?? platform();
    this.appData = opts.appDataOverride ?? process.env['APPDATA'];
    this.maxWorkspaces = opts.maxWorkspaces ?? 50;
    this.maxDatabases = opts.maxDatabases ?? 20;
  }

  async read(_cwd: string): Promise<SessionReaderResult> {
    const candidates = await this.collectVscdbCandidates();
    if (candidates.length === 0) return { sessions: [], prompts: [] };

    for (const candidate of candidates) {
      const extracted = extractFromVscdb(candidate.path, candidate.mtimeMs);
      if (extracted && extracted.prompts.length > 0) return extracted;
    }

    // Cursor is present but no recognizable chat payload — keep the historical
    // detection-only contract so downstream Article 50 / AI-BOM still records usage.
    const mostRecent = candidates[0] as VscdbCandidate;
    const session: AiSession = {
      sessionId: `cursor-detected-${mostRecent.mtimeMs}`,
      tool: 'cursor',
      model: 'unknown',
      startedAt: new Date(mostRecent.mtimeMs).toISOString(),
    };
    return { sessions: [session], prompts: [] };
  }

  private async collectVscdbCandidates(): Promise<VscdbCandidate[]> {
    const results: VscdbCandidate[] = [];
    const dirOpts = {
      home: this.home,
      platform: this.platform,
      ...(this.appData ? { appData: this.appData } : {}),
    };

    const wsDir = getCursorWorkspaceStorageDir(dirOpts);
    if (wsDir && existsSync(wsDir)) {
      let workspaces: string[] = [];
      try {
        workspaces = (await readdir(wsDir)).slice(0, this.maxWorkspaces);
      } catch {
        workspaces = [];
      }
      for (const ws of workspaces) {
        const dbPath = join(wsDir, ws, 'state.vscdb');
        if (!existsSync(dbPath)) continue;
        try {
          results.push({ path: dbPath, mtimeMs: (await stat(dbPath)).mtimeMs });
        } catch {
          continue;
        }
      }
    }

    const gsDir = getCursorGlobalStorageDir(dirOpts);
    if (gsDir) {
      const gdbPath = join(gsDir, 'state.vscdb');
      if (existsSync(gdbPath)) {
        try {
          results.push({ path: gdbPath, mtimeMs: (await stat(gdbPath)).mtimeMs });
        } catch {
          /* ignore */
        }
      }
    }

    results.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return results.slice(0, this.maxDatabases);
  }
}

interface NormalizeResult {
  readonly sessions: AiSession[];
  readonly prompts: AiPromptRecord[];
}

const EMPTY: NormalizeResult = { sessions: [], prompts: [] };

function extractFromVscdb(dbPath: string, dbMtimeMs: number): SessionReaderResult | null {
  let db: Database.Database | undefined;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma('query_only = true');

    const sessions: AiSession[] = [];
    const prompts: AiPromptRecord[] = [];
    const absorb = (n: NormalizeResult): void => {
      if (n.prompts.length === 0) return;
      sessions.push(...n.sessions);
      prompts.push(...n.prompts);
    };

    if (tableExists(db, 'ItemTable')) {
      const stmt = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
      for (const key of CURSOR_CHAT_KEYS) {
        if (prompts.length >= MAX_PROMPTS_PER_DB) break;
        const row = stmt.get(key) as { value?: unknown } | undefined;
        const raw = parseJsonValue(row?.value);
        if (raw === undefined) continue;
        absorb(normalizeCursorChat(raw, dbMtimeMs));
      }
    }

    if (prompts.length === 0 && tableExists(db, 'cursorDiskKV')) {
      absorb(extractFromDiskKv(db, dbMtimeMs));
    }

    if (prompts.length === 0) return null;
    return { sessions, prompts: prompts.slice(0, MAX_PROMPTS_PER_DB) };
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

/** Newer Cursor: global `cursorDiskKV` holds `composerData:<id>` headers + `bubbleId:<id>:<bid>` rows. */
function extractFromDiskKv(db: Database.Database, dbMtimeMs: number): NormalizeResult {
  const sessions: AiSession[] = [];
  const prompts: AiPromptRecord[] = [];
  let composerRows: Array<{ key: string; value?: unknown }>;
  try {
    composerRows = db
      .prepare(`SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%' LIMIT ${MAX_COMPOSER_ROWS}`)
      .all() as Array<{ key: string; value?: unknown }>;
  } catch {
    return EMPTY;
  }

  const bubbleByExactKey = db.prepare('SELECT value FROM cursorDiskKV WHERE key = ?');
  const bubblesByPrefix = db.prepare(`SELECT value FROM cursorDiskKV WHERE key LIKE ? LIMIT ${MAX_BUBBLE_ROWS}`);

  for (const r of composerRows) {
    if (prompts.length >= MAX_PROMPTS_PER_DB) break;
    const raw = parseJsonValue(r.value);
    const obj = asObj(raw);
    if (!obj) continue;
    const composerId = r.key.slice('composerData:'.length) || `c${dbMtimeMs}`;

    // (a) inline conversation array (older Cursor)
    if (Array.isArray(obj['conversation'])) {
      const n = normalizeCursorChat({ ...obj, composerId }, dbMtimeMs);
      sessions.push(...n.sessions);
      prompts.push(...n.prompts);
      continue;
    }

    // (b) headers list bubbleIds in order; bubbles live in separate rows
    const headers =
      asArray(obj['fullConversationHeadersOnly']).length > 0
        ? asArray(obj['fullConversationHeadersOnly'])
        : asArray(obj['conversationHeaders']);
    let conversation: unknown[];
    if (headers.length > 0) {
      conversation = [];
      for (const h of headers) {
        const bid = str(asObj(h)?.['bubbleId']);
        if (!bid) continue;
        const brow = bubbleByExactKey.get(`bubbleId:${composerId}:${bid}`) as { value?: unknown } | undefined;
        const bval = parseJsonValue(brow?.value);
        if (asObj(bval)) conversation.push(bval);
      }
    } else {
      let bubbleRows: Array<{ value?: unknown }>;
      try {
        bubbleRows = bubblesByPrefix.all(`bubbleId:${composerId}:%`) as Array<{ value?: unknown }>;
      } catch {
        bubbleRows = [];
      }
      conversation = bubbleRows.map((b) => parseJsonValue(b.value)).filter((v) => asObj(v) !== null);
    }
    if (conversation.length === 0) continue;
    const n = normalizeCursorChat({ composerId, conversation, createdAt: obj['createdAt'] }, dbMtimeMs);
    sessions.push(...n.sessions);
    prompts.push(...n.prompts);
  }

  return { sessions, prompts };
}

/**
 * Probes known Cursor chat-payload shapes in order; the first probe yielding at
 * least one non-empty prompt wins. Loose type-guards only — never assume a key
 * exists, ignore unknown fields, never throw.
 */
export function normalizeCursorChat(raw: unknown, dbMtimeMs: number): NormalizeResult {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return EMPTY;
    }
  }

  const probes: Array<(v: unknown, ms: number) => NormalizeResult> = [
    tryShapeFlatPrompts, // `aiService.prompts` — Array<{ text }>
    tryShapeTabs, // `chatdata` — { tabs: [{ bubbles: [...] }] }
    tryShapeConversation, // composer record — { composerId?, conversation: [...] }
    tryShapeAllComposers, // { allComposers: [{ conversation: [...] }] }
  ];
  for (const probe of probes) {
    try {
      const result = probe(value, dbMtimeMs);
      if (result.prompts.length > 0) return result;
    } catch {
      /* try next shape */
    }
  }
  return EMPTY;
}

function tryShapeFlatPrompts(value: unknown, dbMtimeMs: number): NormalizeResult {
  if (!Array.isArray(value) || value.length === 0) return EMPTY;
  const sessionId = `cursor-prompts-${dbMtimeMs}`;
  const timestamp = new Date(dbMtimeMs).toISOString();
  const prompts: AiPromptRecord[] = [];
  for (const item of value) {
    const text = (str(asObj(item)?.['text']) ?? str(item))?.trim();
    if (!text) continue;
    prompts.push({ sessionId, index: prompts.length, prompt: text, timestamp });
  }
  if (prompts.length === 0) return EMPTY;
  return { sessions: [{ sessionId, tool: 'cursor', model: 'unknown', startedAt: timestamp }], prompts };
}

function tryShapeTabs(value: unknown, dbMtimeMs: number): NormalizeResult {
  const tabs = asArray(asObj(value)?.['tabs']);
  if (tabs.length === 0) return EMPTY;
  const sessions: AiSession[] = [];
  const prompts: AiPromptRecord[] = [];
  let tabIndex = 0;
  for (const tab of tabs) {
    const t = asObj(tab);
    if (!t) continue;
    const bubbles = asArray(t['bubbles']);
    if (bubbles.length === 0) continue;
    const sessionId = `cursor-${str(t['tabId']) ?? `tab${tabIndex}`}`;
    const startedAt = isoFromMs(num(t['lastSendTime']), dbMtimeMs);
    const { paired, model } = pairBubbles(bubbles, sessionId, startedAt);
    if (paired.length === 0) continue;
    sessions.push({ sessionId, tool: 'cursor', model: model ?? 'unknown', startedAt });
    prompts.push(...paired);
    tabIndex++;
  }
  return { sessions, prompts };
}

function tryShapeConversation(value: unknown, dbMtimeMs: number): NormalizeResult {
  const root = asObj(value);
  if (!root) return EMPTY;
  const conv = asArray(root['conversation']);
  if (conv.length === 0) return EMPTY;
  const sessionId = `cursor-${str(root['composerId']) ?? `c${dbMtimeMs}`}`;
  const startedAt = isoFromMs(num(root['createdAt']) ?? num(root['lastUpdatedAt']), dbMtimeMs);
  const { paired, model } = pairBubbles(conv, sessionId, startedAt);
  if (paired.length === 0) return EMPTY;
  return { sessions: [{ sessionId, tool: 'cursor', model: model ?? 'unknown', startedAt }], prompts: paired };
}

function tryShapeAllComposers(value: unknown, dbMtimeMs: number): NormalizeResult {
  const root = asObj(value);
  if (!root) return EMPTY;
  const composers = [...asArray(root['allComposers']), ...asArray(root['composers'])];
  if (composers.length === 0) return EMPTY;
  const sessions: AiSession[] = [];
  const prompts: AiPromptRecord[] = [];
  for (const c of composers) {
    const o = asObj(c);
    if (!o || !Array.isArray(o['conversation'])) continue;
    const r = tryShapeConversation(o, dbMtimeMs);
    sessions.push(...r.sessions);
    prompts.push(...r.prompts);
  }
  return { sessions, prompts };
}

function isUserBubble(type: unknown): boolean {
  return type === 'user' || type === 1 || type === '1';
}

function isAiBubble(type: unknown): boolean {
  return type === 'ai' || type === 'assistant' || type === 2 || type === '2';
}

function pairBubbles(
  bubbles: readonly unknown[],
  sessionId: string,
  timestamp: string,
): { paired: AiPromptRecord[]; model?: string } {
  const paired: AiPromptRecord[] = [];
  let model: string | undefined;
  let pendingUser: string | undefined;

  const flush = (response?: string): void => {
    if (pendingUser === undefined) return;
    const prompt = pendingUser.trim();
    pendingUser = undefined;
    if (prompt.length === 0) return;
    paired.push(
      response ? { sessionId, index: paired.length, prompt, timestamp, response } : { sessionId, index: paired.length, prompt, timestamp },
    );
  };

  for (const bubble of bubbles) {
    const o = asObj(bubble);
    if (!o) continue;
    const text = str(o['text']) ?? str(o['richText']);
    if (!model) model = str(o['modelType']) ?? str(o['model']);
    if (isUserBubble(o['type'])) {
      flush(); // a prior pending user with no response
      pendingUser = text ?? '';
    } else if (isAiBubble(o['type'])) {
      flush(text);
    }
  }
  flush();
  return model ? { paired, model } : { paired };
}

function tableExists(db: Database.Database, name: string): boolean {
  try {
    return db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
  } catch {
    return false;
  }
}

function parseJsonValue(value: unknown): unknown {
  if (value == null) return undefined;
  let text: string;
  if (typeof value === 'string') text = value;
  else if (Buffer.isBuffer(value)) text = value.toString('utf-8');
  else if (value instanceof Uint8Array) text = Buffer.from(value).toString('utf-8');
  else return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function asObj(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function isoFromMs(ms: number | undefined, fallbackMs: number): string {
  return new Date(ms !== undefined && ms > 0 ? ms : fallbackMs).toISOString();
}
