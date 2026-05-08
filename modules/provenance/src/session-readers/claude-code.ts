import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AiSession, AiPromptRecord } from '../types.js';
import type { SessionReader, SessionReaderResult } from './types.js';

export function encodeClaudeProjectId(cwd: string): string {
  return resolve(cwd).replace(/[\\/:\s]/g, '-');
}

interface JsonlEntry {
  type?: string;
  sessionId?: string;
  timestamp?: string;
  version?: string;
  message?: {
    role?: string;
    model?: string;
    content?: Array<{ type: string; text?: string }>;
  };
}

export interface ClaudeCodeReaderOptions {
  readonly homeDir?: string;
  readonly maxSessions?: number;
}

export class ClaudeCodeSessionReader implements SessionReader {
  readonly id = 'claude-code';
  private readonly homeDir: string;
  private readonly maxSessions: number;

  constructor(opts: ClaudeCodeReaderOptions = {}) {
    this.homeDir = opts.homeDir ?? homedir();
    this.maxSessions = opts.maxSessions ?? 10;
  }

  async read(cwd: string): Promise<SessionReaderResult> {
    const projectsDir = join(this.homeDir, '.claude', 'projects');
    const projectDir = join(projectsDir, encodeClaudeProjectId(cwd));
    if (!existsSync(projectDir)) return { sessions: [], prompts: [] };

    const entries = await readdir(projectDir);
    const jsonlPaths = entries.filter((f) => f.endsWith('.jsonl')).map((f) => join(projectDir, f));
    if (jsonlPaths.length === 0) return { sessions: [], prompts: [] };

    const withMtime = await Promise.all(
      jsonlPaths.map(async (path) => ({ path, mtime: (await stat(path)).mtimeMs })),
    );
    withMtime.sort((a, b) => b.mtime - a.mtime);

    const sessions: AiSession[] = [];
    const prompts: AiPromptRecord[] = [];
    for (const { path } of withMtime.slice(0, this.maxSessions)) {
      const session = await parseJsonlSession(path, prompts);
      if (session) sessions.push(session);
    }
    return { sessions, prompts };
  }
}

async function parseJsonlSession(
  path: string,
  promptsOut: AiPromptRecord[],
): Promise<AiSession | null> {
  const raw = await readFile(path, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  let sessionId: string | null = null;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  let version: string | null = null;
  let model: string | null = null;
  let promptIndex = 0;

  for (const line of lines) {
    let entry: JsonlEntry;
    try {
      entry = JSON.parse(line) as JsonlEntry;
    } catch {
      continue;
    }

    if (entry.sessionId && !sessionId) sessionId = entry.sessionId;
    if (entry.version && !version) version = entry.version;
    if (entry.timestamp) {
      if (!firstTimestamp) firstTimestamp = entry.timestamp;
      lastTimestamp = entry.timestamp;
    }

    if (entry.type === 'assistant' && entry.message?.model && !model) {
      model = entry.message.model;
    }

    if (entry.type === 'user' && entry.message?.role === 'user') {
      const text = extractUserText(entry.message.content);
      if (text && sessionId && entry.timestamp) {
        promptsOut.push({
          sessionId,
          index: promptIndex++,
          prompt: text,
          timestamp: entry.timestamp,
        });
      }
    }
  }

  if (!sessionId || !firstTimestamp) return null;

  return {
    sessionId,
    tool: 'claude-code',
    model: model ?? 'unknown',
    ...(version ? { modelVersion: version } : {}),
    startedAt: firstTimestamp,
    ...(lastTimestamp && lastTimestamp !== firstTimestamp ? { endedAt: lastTimestamp } : {}),
  };
}

function extractUserText(content?: Array<{ type: string; text?: string }>): string | null {
  if (!content || !Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const c of content) {
    if (c.type === 'text' && typeof c.text === 'string') {
      const text = c.text;
      if (text.startsWith('<ide_') || text.startsWith('<system-')) continue;
      parts.push(text);
    }
  }
  return parts.length > 0 ? parts.join('\n') : null;
}
